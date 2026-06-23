"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";

interface DashboardStats {
  total_revenue: string; total_orders: number; total_users: number;
  total_menu_items: number; total_categories: number; pending_orders: number;
  revenue_today: string; orders_today: number; orders_by_status: Record<string, number>;
}

export default function AdminDashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/admin/dashboard/")
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>;
  if (!stats) return <div className="text-center py-16 text-text-secondary">{t("admin.denied")}</div>;

  const statCards = [
    { label: t("admin.total_revenue"), value: `$${parseFloat(stats.total_revenue).toLocaleString()}`, color: "text-green-600", bg: "bg-green-50" },
    { label: t("admin.total_orders"), value: stats.total_orders.toLocaleString(), color: "text-blue-600", bg: "bg-blue-50" },
    { label: t("admin.pending_orders"), value: stats.pending_orders.toLocaleString(), color: "text-yellow-600", bg: "bg-yellow-50" },
    { label: t("admin.revenue_today"), value: `$${parseFloat(stats.revenue_today).toFixed(2)}`, color: "text-primary-600", bg: "bg-primary-50" },
    { label: t("admin.orders_today"), value: stats.orders_today.toLocaleString(), color: "text-purple-600", bg: "bg-purple-50" },
    { label: t("admin.total_users"), value: stats.total_users.toLocaleString(), color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: t("admin.menu_items"), value: stats.total_menu_items.toLocaleString(), color: "text-cyan-600", bg: "bg-cyan-50" },
    { label: t("admin.categories"), value: stats.total_categories.toLocaleString(), color: "text-orange-600", bg: "bg-orange-50" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t("admin.dashboard")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("admin.subtitle")}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/orders" className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2 border border-border rounded-lg hover:bg-surface-hover transition-colors">
            {t("admin.manage_orders")}
          </Link>
          <Link href="/admin/menu" className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2 border border-border rounded-lg hover:bg-surface-hover transition-colors">
            {t("admin.manage_menu")}
          </Link>
          <Link href="/admin/categories" className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2 border border-border rounded-lg hover:bg-surface-hover transition-colors">
            {t("admin.manage_categories")}
          </Link>
          <Link href="/admin/users" className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2 border border-border rounded-lg hover:bg-surface-hover transition-colors">
            {t("admin_users.title")}
          </Link>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/admin/orders/export/`}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2 border border-border rounded-lg hover:bg-surface-hover transition-colors"
          >
            {t("admin.export_csv")}
          </a>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((s) => (
          <Card key={s.label} className={`p-5 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-text-secondary mt-1">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Orders by Status */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t("admin.orders_by_status")}</h2>
        <div className="space-y-3">
          {Object.entries(stats.orders_by_status).map(([status, count]) => (
            <div key={status} className="flex items-center gap-4">
              <span className="w-28 text-sm font-medium capitalize text-text-secondary">{t(`status.${status}`)}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-primary-600 h-2.5 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (count / Math.max(1, stats.total_orders)) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold w-8 text-right">{count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
