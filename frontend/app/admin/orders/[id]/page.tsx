"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import toast from "react-hot-toast";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import Button from "@/components/ui/Button";
import { StatusBadge, PaymentBadge } from "@/components/ui/Badge";

export default function AdminOrderDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [updating, setUpdating] = useState(false);
  const fetchedOnce = useRef(false);

  const fetchOrder = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/admin/orders/${id}/`);
      setOrder(data);
      setNewStatus(data.status);
      return data;
    } catch {
      if (!fetchedOnce.current) {
        toast.error(t("admin_order.not_found"));
        router.push("/admin/orders");
      }
      return null;
    }
  }, [id, router, t]);

  useEffect(() => {
    fetchedOnce.current = false;
    fetchOrder().finally(() => { fetchedOnce.current = true; setLoading(false); });
  }, [fetchOrder, id]);

  useEffect(() => {
    if (!id || loading) return;
    const interval = setInterval(() => {
      fetchOrder().then((data) => {
        if (data && ["delivered", "cancelled"].includes(data.status)) clearInterval(interval);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [id, loading, fetchOrder]);

  const updateStatus = async () => {
    if (!newStatus || newStatus === order.status) return;
    setUpdating(true);
    try {
      const { data } = await api.patch(`/api/orders/${id}/status/`, {
        status: newStatus,
        note: note,
      });
      setOrder(data);
      setNote("");
      toast.success(t("admin_order.updated"));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t("admin_order.update_error"));
    } finally { setUpdating(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>;
  if (!order) return null;

  const transitions: Record<string, string[]> = {
    pending: ["preparing", "cancelled"],
    preparing: ["out_for_delivery", "cancelled"],
    out_for_delivery: ["delivered"],
    delivered: [],
    cancelled: [],
  };

  const allowed = transitions[order.status] || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/orders" className="text-text-secondary hover:text-text-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-text-primary">Order #{order.id}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-text-secondary text-sm mt-1">
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t("admin_order.items")}</h2>
            <div className="divide-y divide-border">
              {order.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between py-3">
                  <div>
                    <p className="font-medium">{item.menu_item_name}</p>
                    <p className="text-sm text-text-secondary">{t("admin_order.qty")} {item.quantity} × ${parseFloat(item.unit_price).toFixed(2)}</p>
                  </div>
                  <span className="font-semibold">${(item.quantity * parseFloat(item.unit_price)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-4 flex justify-between text-lg font-bold">
              <span>{t("admin_order.total")}</span>
              <span className="text-primary-600">${order.total_price}</span>
            </div>
          </Card>

          {/* Update Status */}
          {allowed.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t("admin_order.update_status")}</h2>
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {allowed.map((s) => (
                    <button
                      key={s}
                      onClick={() => setNewStatus(s)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        newStatus === s ? "bg-primary-600 text-white" : "bg-surface-hover text-text-secondary hover:bg-primary-100"
                      }`}
                    >
                      {t(`status.${s}`)}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder={t("admin_order.note_placeholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <Button loading={updating} onClick={updateStatus} disabled={newStatus === order.status}>
                  {t("admin_order.update_btn")}
                </Button>
              </div>
            </Card>
          )}

          {/* Status Log */}
          {order.status_logs?.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t("admin_order.status_history")}</h2>
              <div className="space-y-3">
                {order.status_logs.map((log: any) => (
                  <div key={log.id} className="flex items-center gap-3 text-sm">
                    <StatusBadge status={log.to_status} />
                    <span className="text-text-secondary">
                      {log.note && `— ${log.note}`}
                    </span>
                    <span className="text-text-muted text-xs ml-auto">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide mb-3">{t("admin_order.customer")}</h3>
            <p className="text-sm font-medium">{order.user_name || `User #${order.user}`}</p>
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide mb-3">{t("admin_order.payment")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("admin_order.method")}</span>
                <span className="font-medium capitalize">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("admin_order.status")}</span>
                <PaymentBadge status={order.payment_status} />
              </div>
            </div>
          </Card>
          {order.delivery_address && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide mb-3">{t("admin_order.delivery")}</h3>
              <p className="text-sm">{order.delivery_address}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
