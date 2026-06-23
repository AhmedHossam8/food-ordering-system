"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language";
import api from "@/lib/api";
import { formatPrice } from "@/lib/utils";

interface CartItem {
  id: number; menu_item: number; menu_item_name: string;
  menu_item_price: string; quantity: number; subtotal: string;
}

export default function Navbar() {
  const { user, logout, isAuthenticated, cartCount, refreshCartCount } = useAuthStore();
  const { lang, toggleLang, t } = useLanguage();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const authed = mounted && isAuthenticated();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState("0.00");
  const [isStaff, setIsStaff] = useState(false);
  const isHome = pathname === "/";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (authed) {
      api.get("/api/users/profile/").then(({ data }) => {
        setIsStaff(data.user?.is_staff || false);
        if (!user) {
          useAuthStore.getState().setAuth(
            { id: data.user.id, username: data.user.username, email: data.user.email },
            localStorage.getItem("access_token") || "",
            localStorage.getItem("refresh_token") || "",
          );
        }
      }).catch(() => {});
      refreshCartCount();
    }
  }, [authed]);

  useEffect(() => {
    if (authed && cartOpen) {
      api.get("/api/orders/cart/").then(({ data }) => {
        setCartItems(data.items || []);
        setCartTotal(data.total || "0.00");
      }).catch(() => {});
    }
  }, [authed, cartOpen]);

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <span
              className={`text-xl font-bold text-primary-600 ${authed ? "" : "cursor-pointer"}`}
            >
              {authed ? (
                <span>FoodOrder</span>
              ) : isHome ? (
                <span onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>FoodOrder</span>
              ) : (
                <Link href="/">FoodOrder</Link>
              )}
            </span>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/menu" className="text-text-secondary hover:text-primary-600 transition-colors font-medium">
                {t("nav.menu")}
              </Link>
              {authed && (
                <Link href="/orders" className="text-text-secondary hover:text-primary-600 transition-colors font-medium">
                  {t("nav.orders")}
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {authed && (
              <div className="relative">
                <button
                  onClick={() => setCartOpen(!cartOpen)}
                  className="relative p-2 text-text-secondary hover:text-primary-600 transition-colors"
                  aria-label="Cart"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-error text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {cartCount}
                    </span>
                  )}
                </button>
                {cartOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setCartOpen(false)} />
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-border rounded-xl shadow-xl z-20 py-2 max-h-96 flex flex-col">
                      {cartItems.length === 0 ? (
                        <p className="px-4 py-8 text-center text-text-muted text-sm">{t("cart.empty_title")}</p>
                      ) : (
                        <>
                          <div className="overflow-y-auto flex-1">
                            {cartItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-hover">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-text-primary truncate">{item.menu_item_name}</p>
                                  <p className="text-xs text-text-muted">
                                    {t("cart.qty_label")} {item.quantity} x {formatPrice(item.menu_item_price, lang)}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-text-primary ml-3">{formatPrice(item.subtotal, lang)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="border-t border-border px-4 py-3 flex items-center justify-between">
                            <span className="text-sm font-semibold text-text-primary">{t("cart.total")}</span>
                            <span className="text-sm font-bold text-primary-600">{formatPrice(cartTotal, lang)}</span>
                          </div>
                          <div className="border-t border-border px-4 py-2 flex gap-2">
                            <Link
                              href="/cart"
                              onClick={() => setCartOpen(false)}
                              className="flex-1 text-center text-sm font-medium text-text-secondary border border-border rounded-lg px-3 py-1.5 hover:bg-surface-hover transition-colors"
                            >
                              {t("nav.view_cart")}
                            </Link>
                            <Link
                              href="/checkout"
                              onClick={() => setCartOpen(false)}
                              className="flex-1 text-center text-sm font-medium bg-primary-600 text-white rounded-lg px-3 py-1.5 hover:bg-primary-700 transition-colors"
                            >
                              {t("cart.checkout")}
                            </Link>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <button onClick={toggleLang} className="text-sm font-medium text-text-secondary hover:text-primary-600 transition-colors px-2 py-1 border border-border rounded">
              {t("nav.lang_btn")}
            </button>

            {authed ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center font-bold text-sm">
                    {user?.username?.[0]?.toUpperCase() || "U"}
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-text-primary">{user?.username}</span>
                  <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white border border-border rounded-xl shadow-xl z-20 py-2">
                      <Link href="/profile" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-hover">
                        {t("nav.profile")}
                      </Link>
                      <Link href="/orders" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-hover">
                        {t("nav.my_orders")}
                      </Link>
                      {isStaff && (
                        <Link href="/admin" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-hover border-t border-border">
                          {t("nav.admin_panel")}
                        </Link>
                      )}
                      <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-red-50 border-t border-border">
                        {t("nav.logout")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-primary-600 px-3 py-1.5 transition-colors">
                  {t("nav.login")}
                </Link>
                <Link href="/register" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                  {t("nav.signup")}
                </Link>
              </div>
            )}

            <button className="md:hidden p-2" onClick={() => setMenuOpen(!menuOpen)}>
              <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-2">
            <Link href="/menu" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:bg-surface-hover rounded-lg">
              {t("nav.menu")}
            </Link>
            {authed && (
              <>
                <Link href="/cart" onClick={() => { setMenuOpen(false); setCartOpen(false); }} className="block px-3 py-2 text-text-secondary hover:bg-surface-hover rounded-lg">
                  {t("nav.cart")} {cartCount > 0 && `(${cartCount})`}
                </Link>
                <Link href="/orders" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:bg-surface-hover rounded-lg">
                  {t("nav.orders")}
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
