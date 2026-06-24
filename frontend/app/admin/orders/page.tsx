"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { StatusBadge, PaymentBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

interface Order {
  id: number; user: number; status: string; total_price: string;
  payment_method: string; payment_status: string; created_at: string;
  delivery_address: string;
  user_name?: string;
}

export default function AdminOrdersPage() {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const { data } = await api.get("/api/admin/orders/", { params });
      setOrders(data.results || data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter]);

  const statuses = ["", "pending", "preparing", "out_for_delivery", "delivered", "cancelled"];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t("admin_orders.title")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("admin_orders.subtitle")}</p>
        </div>
        <Link href="/admin" className="text-sm text-primary-600 hover:underline">{t("admin_orders.back")}</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                statusFilter === s ? "bg-primary-600 text-white" : "bg-surface-hover text-text-secondary hover:bg-primary-100"
              }`}
            >
              {s ? t(`status.${s}`) : t("admin_orders.all")}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder={t("admin_orders.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
          className="px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : orders.length === 0 ? (
        <p className="text-center py-16 text-text-secondary">{t("admin_orders.empty")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-start py-3 px-4 font-medium text-text-secondary">{t("admin_orders.id")}</th>
                <th className="text-start py-3 px-4 font-medium text-text-secondary">{t("admin_orders.user")}</th>
                <th className="text-start py-3 px-4 font-medium text-text-secondary">{t("admin_orders.status")}</th>
                <th className="text-start py-3 px-4 font-medium text-text-secondary">{t("admin_orders.payment")}</th>
                <th className="text-end py-3 px-4 font-medium text-text-secondary">{t("admin_orders.total")}</th>
                <th className="text-start py-3 px-4 font-medium text-text-secondary">{t("admin_orders.date")}</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-surface-hover transition-colors">
                  <td className="py-3 px-4 font-medium">#{order.id}</td>
                  <td className="py-3 px-4 text-text-secondary">{order.user_name || `User #${order.user}`}</td>
                  <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                  <td className="py-3 px-4"><PaymentBadge status={order.payment_status} /></td>
                  <td className="py-3 px-4 text-end font-medium">${order.total_price}</td>
                  <td className="py-3 px-4 text-text-secondary text-xs">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <Link href={`/admin/orders/${order.id}`} className="text-primary-600 hover:underline text-xs font-medium">
                      {t("admin_orders.view")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
