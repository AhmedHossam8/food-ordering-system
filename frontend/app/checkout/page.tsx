"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { formatPrice } from "@/lib/utils";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";

export default function CheckoutPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [address, setAddress] = useState("");
  const [addressError, setAddressError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savedAddress, setSavedAddress] = useState<string | null>(null);
  const [showAddressInput, setShowAddressInput] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/api/orders/cart/"),
      api.get("/api/users/profile/"),
    ])
      .then(([cartRes, profileRes]) => {
        setItems(cartRes.data.items || []);
        setTotal(cartRes.data.total || "0.00");
        const addr = profileRes.data.address || "";
        setSavedAddress(addr);
        if (addr) {
          setAddress(addr);
        }
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

  const useSaved = () => {
    if (savedAddress) {
      setAddress(savedAddress);
      setShowAddressInput(false);
      setAddressError("");
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
            <h2 className="text-lg font-semibold mb-4">
              {t("checkout.address_title")} <span className="text-error">*</span>
            </h2>

            {savedAddress && !showAddressInput ? (
              <div className="space-y-3">
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{t("checkout.use_saved")}</p>
                      <p className="text-sm text-text-secondary mt-1">{savedAddress}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="primary" onClick={useSaved}>
                    {t("checkout.use_this")}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddressInput(true)}>
                    {t("checkout.edit")}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {savedAddress && showAddressInput && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t("checkout.saved_hint")}</span>
                    <button onClick={() => { setAddress(savedAddress); setShowAddressInput(false); setAddressError(""); }} className="text-primary-600 hover:text-primary-700 font-medium underline ml-auto">
                      {t("checkout.use_this")}
                    </button>
                  </div>
                )}
                {!savedAddress && (
                  <p className="text-xs text-text-muted mb-1">
                    <span className="text-error">*</span> {t("checkout.required_field")}
                  </p>
                )}
                {savedAddress && showAddressInput && (
                  <p className="text-xs text-text-muted mb-1">
                    <span className="text-error">*</span> {t("checkout.required_field")}
                  </p>
                )}
                <Input
                  multiline
                  rows={3}
                  placeholder={t("checkout.address_placeholder")}
                  value={address}
                  onChange={(e) => { setAddress(e.target.value); setAddressError(""); }}
                  required
                  error={addressError}
                />
              </div>
            )}
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
                  <span className="font-medium">{formatPrice(item.subtotal, lang)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("checkout.subtotal")}</span>
                <span>{formatPrice(total, lang)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">{t("checkout.delivery")}</span>
                <span className="text-success font-medium">{t("checkout.free")}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>{t("checkout.total")}</span>
                <span className="text-primary-600">{formatPrice(total, lang)}</span>
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
