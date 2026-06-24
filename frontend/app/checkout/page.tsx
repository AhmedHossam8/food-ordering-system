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

interface SavedAddr {
  city: string; district: string; street: string; building: string; floor: string; flat: string;
}

interface CartItem {
  id: number;
  menu_item_name: string;
  menu_item_name_localized?: string;
  quantity: number;
  subtotal: string;
}

interface CartResponse {
  items: CartItem[];
  total: string;
}

interface ProfileResponse {
  address_city?: string;
  address_district?: string;
  address_street?: string;
  address_building?: string;
  address_floor?: string;
  address_flat?: string;
}

interface OrderResponse {
  id: number;
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error && "response" in error) {
    const apiError = error as { response?: { data?: { detail?: string } } };
    return apiError.response?.data?.detail || fallback;
  }
  return fallback;
}

function MockPaymentForm({
  orderId,
  total,
  lang,
  t,
  onComplete,
}: {
  orderId: number;
  total: string;
  lang: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
  onComplete: () => void;
}) {
  const [paying, setPaying] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
  };

  const formatExpiry = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  };

  const handlePay = async () => {
    setPaying(true);
    await new Promise((r) => setTimeout(r, 1500));
    try {
      await api.post(`/api/orders/${orderId}/simulate-payment/`);
      toast.success(t("checkout.success"));
      onComplete();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, t("checkout.error")));
      setPaying(false);
    }
  };

  return (
    <Card className="p-6 sticky top-24">
      <h2 className="text-lg font-semibold mb-4">{t("checkout.online")}</h2>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-xs text-amber-800 leading-relaxed">
        {t("checkout.demo_notice")}
      </div>

      <div className="space-y-3 mb-4">
        <div>
          <label className="block text-xs text-text-secondary mb-1">{t("checkout.card_number")}</label>
          <input
            type="text"
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            placeholder="4242 4242 4242 4242"
            className="w-full rounded-lg border border-border bg-white p-3 font-mono text-sm outline-none focus:border-primary-500"
            disabled={paying}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-text-secondary mb-1">{t("checkout.expiry")}</label>
            <input
              type="text"
              value={cardExpiry}
              onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
              placeholder="MM/YY"
              className="w-full rounded-lg border border-border bg-white p-3 font-mono text-sm outline-none focus:border-primary-500"
              disabled={paying}
            />
          </div>
          <div>
            <label className="block text-xs text-text-secondary mb-1">{t("checkout.cvc")}</label>
            <input
              type="text"
              value={cardCvc}
              onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="123"
              className="w-full rounded-lg border border-border bg-white p-3 font-mono text-sm outline-none focus:border-primary-500"
              disabled={paying}
            />
          </div>
        </div>
        <p className="text-xs text-text-muted">{t("checkout.demo_fields_hint")}</p>
      </div>

      <Button className="w-full" onClick={handlePay} loading={paying}>
        {paying ? t("checkout.processing") : t("checkout.pay_now")} — {formatPrice(total, lang)}
      </Button>
    </Card>
  );
}

export default function CheckoutPage() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState("0.00");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "online">("cod");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [street, setStreet] = useState("");
  const [building, setBuilding] = useState("");
  const [floor, setFloor] = useState("");
  const [flat, setFlat] = useState("");
  const [addressError, setAddressError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [savedAddr, setSavedAddr] = useState<SavedAddr | null>(null);
  const [showAddressInput, setShowAddressInput] = useState(false);

  const combineAddress = () => {
    const parts = [city, district, street, building, floor, flat].filter(Boolean);
    return parts.join(", ");
  };

  useEffect(() => {
    Promise.all([
      api.get<CartResponse>("/api/orders/cart/"),
      api.get<ProfileResponse>("/api/users/profile/"),
    ])
      .then(([cartRes, profileRes]) => {
        setItems(cartRes.data.items || []);
        setTotal(cartRes.data.total || "0.00");
        const p = profileRes.data;
        if (p.address_city || p.address_district || p.address_street || p.address_building || p.address_floor || p.address_flat) {
          const addr = { city: p.address_city || "", district: p.address_district || "", street: p.address_street || "", building: p.address_building || "", floor: p.address_floor || "", flat: p.address_flat || "" };
          setSavedAddr(addr);
          setCity(addr.city);
          setDistrict(addr.district);
          setStreet(addr.street);
          setBuilding(addr.building);
          setFloor(addr.floor);
          setFlat(addr.flat);
        }
      })
      .catch(() => toast.error(t("checkout.error")))
      .finally(() => setLoading(false));
  }, [t]);

  const placeOrder = async () => {
    const delivery_address = combineAddress();
    if (!delivery_address.trim() || !city.trim() || !district.trim() || !street.trim() || !building.trim() || !floor.trim() || !flat.trim()) {
      setAddressError(t("checkout.enter_address"));
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post<OrderResponse>("/api/orders/create/", {
        payment_method: paymentMethod,
        delivery_address,
      });
      if (paymentMethod === "online") {
        setOrderId(data.id);
        setShowPaymentForm(true);
      } else {
        toast.success(t("checkout.success"));
        router.push(`/orders/${data.id}`);
      }
    } catch (err: unknown) {
      toast.error(apiErrorMessage(err, t("checkout.error")));
    } finally {
      setSubmitting(false);
    }
  };

  const useSaved = () => {
    if (savedAddr) {
      setCity(savedAddr.city);
      setDistrict(savedAddr.district);
      setStreet(savedAddr.street);
      setBuilding(savedAddr.building);
      setFloor(savedAddr.floor);
      setFlat(savedAddr.flat);
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

            {savedAddr && !showAddressInput ? (
              <div className="space-y-3">
                <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">{t("checkout.use_saved")}</p>
                      <p className="text-sm text-text-secondary mt-1">
                        {[savedAddr.city, savedAddr.district, savedAddr.street, savedAddr.building, savedAddr.floor, savedAddr.flat].filter(Boolean).join(", ")}
                      </p>
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
                {savedAddr && showAddressInput && (
                  <div className="flex items-center gap-2 text-sm text-text-secondary mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{t("checkout.saved_hint")}</span>
                    <button onClick={useSaved} className="text-primary-600 hover:text-primary-700 font-medium underline ml-auto">
                      {t("checkout.use_this")}
                    </button>
                  </div>
                )}
                {!savedAddr && (
                  <p className="text-xs text-text-muted mb-1">
                    <span className="text-error">*</span> {t("checkout.required_field")}
                  </p>
                )}
                {savedAddr && showAddressInput && (
                  <p className="text-xs text-text-muted mb-1">
                    <span className="text-error">*</span> {t("checkout.required_field")}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder={t("checkout.address_city")}
                    value={city}
                    onChange={(e) => { setCity(e.target.value); setAddressError(""); }}
                    required
                  />
                  <Input
                    placeholder={t("checkout.address_district")}
                    value={district}
                    onChange={(e) => { setDistrict(e.target.value); setAddressError(""); }}
                    required
                  />
                  <Input
                    placeholder={t("checkout.address_street")}
                    value={street}
                    onChange={(e) => { setStreet(e.target.value); setAddressError(""); }}
                    required
                  />
                  <Input
                    placeholder={t("checkout.address_building")}
                    value={building}
                    onChange={(e) => { setBuilding(e.target.value); setAddressError(""); }}
                    required
                  />
                  <Input
                    placeholder={t("checkout.address_floor")}
                    value={floor}
                    onChange={(e) => { setFloor(e.target.value); setAddressError(""); }}
                    required
                  />
                  <Input
                    placeholder={t("checkout.address_flat")}
                    value={flat}
                    onChange={(e) => { setFlat(e.target.value); setAddressError(""); }}
                    required
                  />
                </div>
                {addressError && <p className="text-xs text-error mt-1">{addressError}</p>}
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
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2">{t("checkout.demo_note")}</p>
            </div>
          </Card>
        </div>

        {/* Right - Summary or Payment Form */}
        <div className="lg:col-span-2">
          {showPaymentForm && orderId ? (
            <MockPaymentForm orderId={orderId} total={total} lang={lang} t={t} onComplete={() => router.push(`/orders/${orderId}`)} />
          ) : (
            <Card className="p-6 sticky top-24">
              <h2 className="text-lg font-semibold mb-4">{t("checkout.summary_title")}</h2>
              <div className="space-y-3 mb-4">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-text-secondary">{(item.menu_item_name_localized || item.menu_item_name)} x{item.quantity}</span>
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
          )}
        </div>
      </div>
    </div>
  );
}