"use client";
import { useLanguage } from "@/lib/language";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
  className?: string;
}

const colors: Record<string, string> = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  danger: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  purple: "bg-purple-100 text-purple-800",
};

export default function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, { key: string; variant: "default" | "success" | "warning" | "danger" | "info" | "purple" }> = {
    pending: { key: "status.pending", variant: "warning" },
    preparing: { key: "status.preparing", variant: "purple" },
    out_for_delivery: { key: "status.out_for_delivery", variant: "info" },
    delivered: { key: "status.delivered", variant: "default" },
    cancelled: { key: "status.cancelled", variant: "danger" },
  };
  const s = map[status] || { key: status, variant: "default" as const };
  return <Badge variant={s.variant}>{t(s.key)}</Badge>;
}

export function PaymentBadge({ status }: { status: string }) {
  const { t } = useLanguage();
  const map: Record<string, { key: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
    pending: { key: "payment.pending", variant: "warning" },
    paid: { key: "payment.paid", variant: "success" },
    failed: { key: "payment.failed", variant: "danger" },
    refunded: { key: "payment.refunded", variant: "info" },
  };
  const s = map[status] || { key: status, variant: "default" as const };
  return <Badge variant={s.variant}>{t(s.key)}</Badge>;
}
