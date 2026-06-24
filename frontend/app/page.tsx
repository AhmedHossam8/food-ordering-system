"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { useAuthStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";

interface MenuItem {
  id: number;
  name: string;
  name_localized?: string;
  price: string;
  category_name: string;
  description: string;
  description_localized?: string;
  image: string | null;
}

interface Category {
  id: number;
  name: string;
  name_localized?: string;
}

export default function HomePage() {
  // ---------------------------
  // Hydration safety (CRITICAL FIX)
  // ---------------------------
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const user = useAuthStore((s) => s.user);
  const { lang, t } = useLanguage();

  const [featured, setFeatured] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const fetchData = async () => {
      try {
        const [itemsRes, catsRes] = await Promise.all([
          api.get("/api/menu/items/", { params: { available: "true" } }),
          api.get("/api/menu/categories/"),
        ]);

        const items = itemsRes.data.results || itemsRes.data;
        const cats = catsRes.data.results || catsRes.data;

        setFeatured(items.slice(0, 6));
        setCategories(cats);
      } catch (err) {
        console.error("Failed to load home data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mounted, lang]);

  // Prevent hydration mismatch completely
  if (!mounted) return null;

  return (
    <div>
      {/* Hero */}
      <section className="relative bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-50" />

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
                className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold px-8 py-3.5 rounded-xl hover:bg-primary-50 transition-all shadow-lg"
              >
                {t("home.view_menu")}
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
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/menu?category=${cat.id}`}
                className="flex-shrink-0 bg-white border rounded-xl px-5 py-3 text-sm font-medium"
              >
                {cat.name_localized || cat.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-bold">
            {t("home.featured_title")}
          </h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((item) => (
              <Card key={item.id}>
                <div className="h-44 bg-gray-100 flex items-center justify-center">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name_localized || item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">🍽️</span>
                  )}
                </div>

                <div className="p-4">
                  <h3 className="text-lg font-semibold">{item.name_localized || item.name}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {item.description_localized || item.description}
                  </p>

                  <div className="mt-4 flex justify-between items-center">
                    <span className="font-bold text-primary-600">
                      {formatPrice(item.price, lang)}
                    </span>

                    <Link href="/menu" className="text-sm text-primary-600">
                      Order
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}