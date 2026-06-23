"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";

export default function CheckoutPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get("/api/orders/cart/")
      .then(({ data }) => {
        setItems(data.items || []);
        setTotal(data.total || "0.00");
      })
      .catch(() => toast.error(t("checkout.error")))
      .finally(() => setLoading(false));
  }, [t]);

  const placeOrder = async () => {
    if (!address.trim()) { setAddressError(t("checkout.enter_address")); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post("/api/orders/create/", {
        payment_method: paymentMethod,
        delivery_address: address,
      });
      toast.success(t("checkout.success"));
      router.push(`/orders/${data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || t("checkout.error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>;

  if (items.length === 0) {
    router.push("/cart");
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-text-primary mb-8">{t("checkout.title")}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left - Order details */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t("checkout.address_title")}</h2>
            <Input
              multiline
              rows={3}
              placeholder={t("checkout.address_placeholder")}
              value={address}
              onChange={(e) => { setAddress(e.target.value); setAddressError(""); }}
              required
              error={addressError}
            />
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t("checkout.payment_title")}</h2>
            <div className="space-y-3">
              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === "cod" ? "border-primary-500 bg-primary-50" : "border-border hover:bg-surface-hover"}`}>
                <input type="radio" name="payment" value="cod" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="accent-primary-600" />
                <div>
                  <p className="font-medium text-text-primary">{t("checkout.cod")}</p>
                  <p className="text-sm text-text-secondary">{t("checkout.cod_desc")}</p>
                </div>
              </label>
              <label className={`flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-colors ${paymentMethod === "online" ? "border-primary-500 bg-primary-50" : "border-border hover:bg-surface-hover"}`}>
                <input type="radio" name="payment" value="online" checked={paymentMethod === "online"} onChange={() => setPaymentMethod("online")} className="accent-primary-600" />
                <div>
                  <p className="font-medium text-text-primary">{t("checkout.online")}</p>
                  <p className="text-sm text-text-secondary">{t("checkout.online_desc")}</p>
                </div>
              </label>
            </div>
          </Card>
        </div>

        {/* Right - Summary */}
        <div className="lg:col-span-2">
          <Card className="p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">{t("checkout.summary_title")}</h2>
            <div className="space-y-3 mb-4">
              {items.map((item: any) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{item.menu_item_name} x{item.quantity}</span>
                  <span className="font-medium">${parseFloat(item.subtotal).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("checkout.subtotal")}</span>
                <span>${total}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("checkout.delivery")}</span>
                <span className="text-success font-medium">{t("checkout.free")}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>{t("checkout.total")}</span>
                <span className="text-primary-600">${total}</span>
              </div>
            </div>
            <Button className="w-full mt-6" size="lg" loading={submitting} onClick={placeOrder}>
              {t("checkout.place_order")}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
