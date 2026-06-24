"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language";
import { formatPrice } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { EmptyState, PageSkeleton } from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";

export default function MenuPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MenuPageContent />
    </Suspense>
  );
}

interface MenuItem {
  id: number; name: string; name_ar: string; name_localized?: string;
  description: string; description_localized?: string;
  price: string; stock: number; is_available: boolean;
  category: number; category_name: string; category_name_localized?: string;
  image: string | null;
}

interface Category {
  id: number; name: string; name_localized?: string;
}

function MenuPageContent() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const isAuthed = useAuthStore((s) => s.isAuthenticated)();

  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  const fetched = useRef(false);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat) setActiveCategory(Number(cat));
    api.get("/api/menu/categories/")
      .then(({ data }) => setCategories(data.results || data))
      .catch(() => {});
  }, [searchParams]);

  useEffect(() => {
      const params: Record<string, string> = {};
      if (activeCategory) params.category = String(activeCategory);
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (!fetched.current) setLoading(true);
    api.get("/api/menu/items/", { params })
      .then(({ data }) => setItems(data.results || data))
      .catch(() => {})
      .finally(() => { fetched.current = true; setLoading(false); });
  }, [activeCategory, minPrice, maxPrice]);

  const addToCart = async (menuItemId: number, qty: number) => {
    if (!isAuthed) { toast.error(t("menu.login_first")); return; }
    try {
      await api.post("/api/orders/cart/add/", { menu_item: menuItemId, quantity: qty });
      toast.success(t("menu.added_to_cart"));
      setSelectedItem(null);
      setQuantity(1);
      useAuthStore.getState().refreshCartCount();
    } catch { toast.error(t("menu.add_failed")); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t("menu.title")}</h1>
          <p className="text-text-secondary mt-1">{t("menu.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          {showFilters ? t("menu.hide_filters") : t("menu.show_filters")}
        </Button>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-surface-card border border-border rounded-xl p-4 mb-6 space-y-4">
          <div className="flex gap-2">
            <Input placeholder={t("menu.min_price")} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <Input placeholder={t("menu.max_price")} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveCategory(null)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${!activeCategory ? "bg-primary-600 text-white" : "bg-surface-hover text-text-secondary hover:bg-primary-100"}`}
              >
                {t("menu.all")}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(activeCategory === cat.id ? null : cat.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeCategory === cat.id ? "bg-primary-600 text-white" : "bg-surface-hover text-text-secondary hover:bg-primary-100"}`}
                >
                  {cat.name_localized || cat.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items */}
      {loading ? <PageSkeleton /> : items.length === 0 ? (
        <EmptyState icon="?" title={t("menu.empty_title")} description={t("menu.empty_desc")} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <Card key={item.id} hover onClick={() => { setSelectedItem(item); setQuantity(1); }}>
              <div className="h-40 bg-gradient-to-br from-primary-50 to-orange-50 rounded-t-xl flex items-center justify-center overflow-hidden">
                {item.image ? (
                  <img src={item.image} alt={item.name_localized || item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl text-primary-300 font-bold">+</span>
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-primary-600 font-medium uppercase tracking-wide">{item.category_name_localized || item.category_name}</p>
                <h3 className="font-semibold text-text-primary mt-1">{item.name_localized || item.name}</h3>
                <p className="text-xs text-text-muted mt-1 line-clamp-2">{item.description_localized || item.description}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-lg font-bold text-primary-600">{formatPrice(item.price, lang)}</span>
                  <Button size="sm" onClick={() => addToCart(item.id, 1)}>
                    {t("menu.add")}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Item Detail Modal */}
      <Modal open={!!selectedItem} onClose={() => setSelectedItem(null)} title={selectedItem?.name_localized || selectedItem?.name}>
        {selectedItem && (
          <div className="space-y-4">
            <div className="h-48 bg-gradient-to-br from-primary-50 to-orange-50 rounded-xl flex items-center justify-center">
              {selectedItem.image ? (
                <img src={selectedItem.image} alt={selectedItem.name_localized || selectedItem.name} className="w-full h-full object-cover rounded-xl" />
              ) : (
                <span className="text-6xl text-primary-300 font-bold">+</span>
              )}
            </div>
            <p className="text-xs text-primary-600 font-medium uppercase">{selectedItem.category_name_localized || selectedItem.category_name}</p>
            <p className="text-text-secondary text-sm">{selectedItem.description_localized || selectedItem.description}</p>
            <p className="text-sm text-text-muted">
              {selectedItem.stock > 0 ? t("menu.in_stock", { count: selectedItem.stock }) : t("menu.always_available")}
            </p>
            <div className="flex items-center gap-4">
              <span className="text-2xl font-bold text-primary-600">{formatPrice(selectedItem.price, lang)}</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-8 h-8 bg-gray-100 rounded-full hover:bg-gray-200 flex items-center justify-center font-medium">-</button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="w-8 h-8 bg-gray-100 rounded-full hover:bg-gray-200 flex items-center justify-center font-medium">+</button>
              </div>
            </div>
            <Button className="w-full" size="lg" onClick={() => addToCart(selectedItem.id, quantity)}>
              {t("menu.add_to_cart")} — {formatPrice((parseFloat(selectedItem.price) * quantity).toFixed(2), lang)}
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
