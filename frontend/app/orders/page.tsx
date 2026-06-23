"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { StatusBadge, PaymentBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";

interface Order {
  id: number; status: string; total_price: string;
  payment_method: string; payment_status: string;
  created_at: string; items_count?: number;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  const fetchOrders = async (status?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (status) params.status = status;
      const { data } = await api.get("/api/orders/", { params });
      setOrders(data.results || data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(statusFilter); }, [statusFilter]);

  const filters = ["", "pending", "confirmed", "preparing", "ready", "delivered", "cancelled"];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">My Orders</h1>
          <p className="text-text-secondary text-sm mt-1">Track and manage your orders</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              statusFilter === f
                ? "bg-primary-600 text-white"
                : "bg-surface-hover text-text-secondary hover:bg-primary-100"
            }`}
          >
            {f ? f.charAt(0).toUpperCase() + f.slice(1) : "All"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : orders.length === 0 ? (
        <EmptyState icon="📋" title="No orders found" action={<Link href="/menu" className="text-primary-600 hover:underline">Browse Menu</Link>} />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card hover className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-50 text-primary-700 rounded-xl flex items-center justify-center font-bold">
                      #{order.id}
                    </div>
                    <div>
                      <p className="font-semibold text-text-primary">Order #{order.id}</p>
                      <p className="text-sm text-text-secondary">
                        {new Date(order.created_at).toLocaleDateString("en-US", {
                          month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <StatusBadge status={order.status} />
                      <p className="text-sm text-text-muted mt-1">
                        <PaymentBadge status={order.payment_status} />
                      </p>
                    </div>
                    <span className="text-lg font-bold text-text-primary">${order.total_price}</span>
                    <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
