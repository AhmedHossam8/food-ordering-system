"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { StatusBadge, PaymentBadge } from "@/components/ui/Badge";

interface OrderItem {
  id: number; menu_item_name: string; quantity: number; unit_price: string;
}

interface StatusLog {
  id: number; from_status: string; to_status: string; note: string; created_at: string;
}

interface Order {
  id: number; status: string; total_price: string; payment_method: string;
  payment_status: string; delivery_address: string; created_at: string;
  items: OrderItem[]; status_logs: StatusLog[];
}

export default function OrderDetailPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);

  const fetchOrder = () =>
    api.get(`/api/orders/${id}/`)
      .then(({ data }) => { setOrder(data); return data; })
      .catch(() => { if (!order) { toast.error(t("order.not_found")); router.push("/orders"); } });

  useEffect(() => {
    if (!id) return;
    fetchOrder().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || loading) return;
    const interval = setInterval(() => {
      fetchOrder().then((data) => {
        if (data && ["delivered", "cancelled"].includes(data.status)) clearInterval(interval);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [id, loading]);

  const cancelOrder = async () => {
    setCancelling(true);
    try {
      await api.post(`/api/orders/${id}/cancel/`);
      toast.success(t("order.cancelled"));
      const { data } = await api.get(`/api/orders/${id}/`);
      setOrder(data);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t("order.cancel_error"));
    } finally { setCancelling(false); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>;
  if (!order) return null;

  const canCancel = order.status === "pending" || order.status === "confirmed";

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-text-primary">Order #{order.id}</h1>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-text-secondary text-sm mt-1">
            {new Date(order.created_at).toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })}
          </p>
        </div>
        {canCancel && (
          <Button variant="danger" loading={cancelling} onClick={cancelOrder}>
            {t("order.cancel")}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Items + Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t("order.items")}</h2>
            <div className="divide-y divide-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="font-medium text-text-primary">{item.menu_item_name}</p>
                    <p className="text-sm text-text-secondary">{t("order.qty")} {item.quantity} × ${parseFloat(item.unit_price).toFixed(2)}</p>
                  </div>
                  <span className="font-semibold">${(item.quantity * parseFloat(item.unit_price)).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border mt-4 pt-4 flex justify-between text-lg font-bold">
              <span>{t("order.total_label")}</span>
              <span className="text-primary-600">${order.total_price}</span>
            </div>
          </Card>

          {/* Status Timeline */}
          {order.status_logs.length > 0 && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t("order.status_history")}</h2>
              <div className="relative">
                {order.status_logs.map((log, idx) => (
                  <div key={log.id} className="flex gap-4 pb-6 last:pb-0 relative">
                    {idx < order.status_logs.length - 1 && (
                      <div className="absolute left-[11px] top-6 bottom-0 w-0.5 bg-border" />
                    )}
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${
                      idx === order.status_logs.length - 1
                        ? "bg-primary-600 text-white"
                        : "bg-gray-200"
                    }`}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-text-primary">
                        <StatusBadge status={log.to_status} />
                      </p>
                      {log.note && <p className="text-sm text-text-secondary mt-1">{log.note}</p>}
                      <p className="text-xs text-text-muted mt-1">
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right - Details */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide mb-3">{t("order.payment")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("order.method")}</span>
                <span className="font-medium capitalize">{order.payment_method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("order.status")}</span>
                <PaymentBadge status={order.payment_status} />
              </div>
            </div>
          </Card>

          {order.delivery_address && (
            <Card className="p-5">
              <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide mb-3">{t("order.delivery")}</h3>
              <p className="text-sm text-text-primary">{order.delivery_address}</p>
            </Card>
          )}

          <Card className="p-5">
            <h3 className="font-semibold text-sm text-text-secondary uppercase tracking-wide mb-3">{t("order.summary")}</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("order.items_label")}</span>
                <span className="font-medium">{order.items.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">{t("order.delivery_label")}</span>
                <span className="font-medium text-success">{t("order.free")}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold text-base">
                <span>{t("order.total_label")}</span>
                <span className="text-primary-600">${order.total_price}</span>
              </div>
            </div>
          </Card>

          <Button href="/menu" variant="outline" className="w-full">
            {t("order.order_again")}
          </Button>
        </div>
      </div>
    </div>
  );
}
