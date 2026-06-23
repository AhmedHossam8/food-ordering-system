"use client";
import Link from "next/link";
import { useLanguage } from "@/lib/language";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="bg-white border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-sm text-text-secondary">
              {t("footer.desc")}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">{t("footer.quick_links")}</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              <Link href="/menu" className="block hover:text-primary-600">{t("footer.menu")}</Link>
              <Link href="/cart" className="block hover:text-primary-600">{t("footer.cart")}</Link>
              <Link href="/orders" className="block hover:text-primary-600">{t("footer.orders")}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-text-primary mb-3">{t("footer.contact")}</h4>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>{t("footer.email")}</p>
              <p>{t("footer.phone")}</p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-border text-center text-sm text-text-muted">
          {t("footer.copyright", { year: new Date().getFullYear() })}
        </div>
      </div>
    </footer>
  );
}
