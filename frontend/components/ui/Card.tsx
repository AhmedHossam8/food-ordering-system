export default function Card({
  children, className = "", hover = false, onClick,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-surface-card border border-border rounded-xl ${hover ? "hover:shadow-lg hover:border-primary-200 transition-all cursor-pointer" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
