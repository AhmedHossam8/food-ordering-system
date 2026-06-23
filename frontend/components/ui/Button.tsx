import Link from "next/link";
import Spinner from "./Spinner";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: React.MouseEventHandler;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  href?: string;
}

export default function Button({
  children, onClick, type = "button", variant = "primary",
  size = "md", disabled, loading, className = "", href,
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants: Record<string, string> = {
    primary: "bg-primary-600 text-white hover:bg-primary-700",
    secondary: "bg-primary-100 text-primary-800 hover:bg-primary-200",
    outline: "border border-border text-text-secondary hover:bg-surface-hover",
    ghost: "text-text-secondary hover:bg-surface-hover",
    danger: "bg-error text-white hover:bg-red-700",
  };

  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-sm gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
    lg: "px-6 py-3 text-base gap-2",
  };

  const cls = `${base} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`;

  if (href) {
    return <Link href={href} className={cls}>{loading && <Spinner />}{children}</Link>;
  }

  return (
    <button type={type} onClick={onClick as React.MouseEventHandler} disabled={disabled || loading} className={cls}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}
