"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { useAuthStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";

interface CartItem {
  id: number; menu_item: number; menu_item_name: string; menu_item_name_localized?: string;
  menu_item_price: string; quantity: number; subtotal: string;
}

export default function CartPage() {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<CartItem[]>(useAuthStore.getState().cartItems);
  const [total, setTotal] = useState(useAuthStore.getState().cartTotal);
  const [loading, setLoading] = useState(!useAuthStore.getState().cartItems.length);
  const [updating, setUpdating] = useState<number | null>(null);
  const router = useRouter();

  const fetchCart = async () => {
    try {
      const { data } = await api.get("/api/orders/cart/");
      const newItems = data.items || [];
      const newTotal = data.total || "0.00";
      setItems(newItems);
      setTotal(newTotal);
      useAuthStore.getState().setCartData(newItems, newTotal);
    } catch { toast.error(t("cart.load_error")); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCart(); }, [lang]);

  const recalcTotal = (updatedItems: CartItem[]) =>
    updatedItems.reduce((s, i) => s + parseFloat(i.subtotal), 0).toFixed(2);

  const updateQty = async (itemId: number, qty: number) => {
    if (qty < 1) return;
    const prev = items;
    setUpdating(itemId);
    const next = items.map((i) =>
      i.id === itemId ? { ...i, quantity: qty, subtotal: (parseFloat(i.menu_item_price) * qty).toFixed(2) } : i
    );
    setItems(next);
    setTotal(recalcTotal(next));
    useAuthStore.getState().setCartData(next, recalcTotal(next));
    try {
      await api.patch(`/api/orders/cart/items/${itemId}/`, { quantity: qty });
      api.get("/api/orders/cart/").then(({ data }) => useAuthStore.getState().setCartData(data.items || [], data.total || "0.00")).catch(() => {});
    } catch {
      setItems(prev);
      setTotal(recalcTotal(prev));
      useAuthStore.getState().setCartData(prev, recalcTotal(prev));
      toast.error(t("cart.update_error"));
    }
    finally { setUpdating(null); }
  };

  const removeItem = async (itemId: number) => {
    const prev = items;
    setUpdating(itemId);
    const next = items.filter((i) => i.id !== itemId);
    setItems(next);
    setTotal(recalcTotal(next));
    useAuthStore.getState().setCartData(next, recalcTotal(next));
    try {
      await api.delete(`/api/orders/cart/items/${itemId}/remove/`);
      toast.success(t("cart.removed"));
      useAuthStore.getState().refreshCartCount();
      api.get("/api/orders/cart/").then(({ data }) => useAuthStore.getState().setCartData(data.items || [], data.total || "0.00")).catch(() => {});
    } catch {
      setItems(prev);
      setTotal(recalcTotal(prev));
      useAuthStore.getState().setCartData(prev, recalcTotal(prev));
      toast.error(t("cart.remove_error"));
    }
    finally { setUpdating(null); }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>;

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16">
        <EmptyState
          icon="?"
          title={t("cart.empty_title")}
          description={t("cart.empty_desc")}
          action={<Button href="/menu">{t("cart.browse_menu")}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t("cart.title")}</h1>
          <p className="text-text-secondary text-sm mt-1">{items.length} {items.length !== 1 ? t("cart.items") : t("cart.item")}</p>
        </div>
        <Button variant="ghost" onClick={async () => {
          const prev = items;
          const prevTotal = total;
          setItems([]);
          setTotal("0.00");
          useAuthStore.getState().setCartData([], "0.00");
          try {
            await api.delete("/api/orders/cart/clear/");
            useAuthStore.getState().refreshCartCount();
            api.get("/api/orders/cart/").then(({ data }) => useAuthStore.getState().setCartData(data.items || [], data.total || "0.00")).catch(() => {});
            toast.success(t("cart.cleared"));
          } catch {
            setItems(prev);
            setTotal(prevTotal);
            useAuthStore.getState().setCartData(prev, prevTotal);
            toast.error(t("cart.clear_error"));
          }
        }}>
          {t("cart.clear")}
        </Button>
      </div>

      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <Card key={item.id} className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-text-primary truncate">{item.menu_item_name_localized || item.menu_item_name}</h3>
                <p className="text-sm text-text-secondary">{formatPrice(item.menu_item_price, lang)} {t("cart.each")}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQty(item.id, item.quantity - 1)}
                  disabled={updating === item.id}
                  className="w-8 h-8 bg-surface-hover rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  -
                </button>
                <span className="w-8 text-center font-medium">
                  {updating === item.id ? <Spinner className="h-4 w-4 mx-auto" /> : item.quantity}
                </span>
                <button
                  onClick={() => updateQty(item.id, item.quantity + 1)}
                  disabled={updating === item.id}
                  className="w-8 h-8 bg-surface-hover rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  +
                </button>
              </div>
              <span className="w-20 text-right font-semibold text-text-primary">
                {formatPrice(item.subtotal, lang)}
              </span>
              <button
                onClick={() => removeItem(item.id)}
                disabled={updating === item.id}
                className="text-text-muted hover:text-error transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-secondary">{t("cart.subtotal")}</span>
          <span className="font-medium">{formatPrice(total, lang)}</span>
        </div>
        <div className="flex items-center justify-between mb-4 text-text-secondary">
          <span>{t("cart.delivery")}</span>
          <span className="font-medium text-success">{t("cart.free")}</span>
        </div>
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <span className="text-lg font-bold text-text-primary">{t("cart.total")}</span>
          <span className="text-2xl font-bold text-primary-600">{formatPrice(total, lang)}</span>
        </div>
        <Button className="w-full mt-6" size="lg" onClick={() => router.push("/checkout")}>
          {t("cart.checkout")}
        </Button>
      </Card>
    </div>
  );
}
