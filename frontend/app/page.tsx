"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { useAuthStore } from "@/lib/store";
import { formatPrice, toArabicDigits } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

interface MenuItem {
  id: number; name: string; price: string; category_name: string;
  description: string; image: string | null;
}

interface Category {
  id: number; name: string;
}

export default function HomePage() {
  const { lang, t } = useLanguage();
  const user = useAuthStore((s) => s.user);
  const [featured, setFeatured] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/menu/items/", { params: { available: "true" } }),
      api.get("/api/menu/categories/"),
    ]).then(([itemsRes, catsRes]) => {
      const items = itemsRes.data.results || itemsRes.data;
      setFeatured(items.slice(0, 6));
      setCategories(catsRes.data.results || catsRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              {t("home.hero_title_1")}{" "}
              <span className="text-primary-100">{t("home.hero_title_2")}</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-100 mb-8 leading-relaxed">
              {t("home.hero_desc")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/menu"
                className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl"
              >
                <span>{t("home.view_menu")}</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              {!user && (
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/10 transition-all"
                >
                  {t("home.get_started")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/menu?category=${cat.id}`}
                className="flex-shrink-0 bg-white border border-border rounded-xl px-5 py-3 text-sm font-medium text-text-secondary hover:border-primary-300 hover:text-primary-600 hover:shadow-md transition-all"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured Items */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary">{t("home.featured_title")}</h2>
            <p className="text-text-secondary mt-1">{t("home.featured_subtitle")}</p>
          </div>
          <Link href="/menu" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
            {t("home.view_all")}
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((item) => (
              <Card key={item.id} hover>
                <div className="h-44 bg-gradient-to-br from-primary-50 to-primary-100 rounded-t-xl flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-t-xl" />
                  ) : (
                    <span className="text-5xl text-primary-300 font-bold">+</span>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-xs text-primary-600 font-medium uppercase tracking-wide">{item.category_name}</p>
                  <h3 className="text-lg font-semibold text-text-primary mt-1">{item.name}</h3>
                  <p className="text-sm text-text-secondary mt-1 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xl font-bold text-primary-600">{formatPrice(item.price, lang)}</span>
                    <Link
                      href="/menu"
                      className="text-sm font-medium text-primary-600 hover:text-primary-700"
                    >
                      {t("home.order_now")}
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Stats */}
      <section className="bg-primary-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: t("home.stat_value_items"), label: t("home.stat_items") },
              { value: t("home.stat_value_customers"), label: t("home.stat_customers") },
              { value: t("home.stat_value_delivery"), label: t("home.stat_delivery") },
              { value: t("home.stat_value_rating"), label: t("home.stat_rating") },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl md:text-4xl font-bold text-primary-600">{lang === "ar" ? toArabicDigits(stat.value) : stat.value}</p>
                <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
          {user ? t("home.cta_logged_in_title") : t("home.cta_title")}
        </h2>
        <p className="text-text-secondary mb-8 max-w-md mx-auto">
          {user ? t("home.cta_logged_in_desc") : t("home.cta_desc")}
        </p>
        <Link
          href={user ? "/menu" : "/register"}
          className="inline-flex items-center gap-2 bg-primary-600 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-700 transition-all shadow-lg"
        >
          {user ? t("home.cta_logged_in_btn") : t("home.cta_btn")}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
        </Link>
      </section>
    </div>
  );
}
