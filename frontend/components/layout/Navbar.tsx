"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/store";
import api from "@/lib/api";

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuthStore();
  const authed = isAuthenticated();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    if (authed) {
      api.get("/api/users/profile/").then(({ data }) => {
        setIsStaff(data.user?.is_staff || false);
      }).catch(() => {});
      api.get("/api/users/language/").then(({ data }) => {
        setLang(data.language);
      }).catch(() => {});
    }
  }, [authed]);

  const toggleLang = async () => {
    const next = lang === "en" ? "ar" : "en";
    try {
      await api.put("/api/users/language/", { language: next });
      setLang(next);
    } catch {}
  };

  return (
    <nav className="bg-white border-b border-border sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">🍽️</span>
              <span className="text-xl font-bold text-primary-600">FoodOrder</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/menu" className="text-text-secondary hover:text-primary-600 transition-colors font-medium">
                {lang === "ar" ? "القائمة" : "Menu"}
              </Link>
              {authed && (
                <>
                  <Link href="/cart" className="text-text-secondary hover:text-primary-600 transition-colors font-medium">
                    {lang === "ar" ? "السلة" : "Cart"}
                  </Link>
                  <Link href="/orders" className="text-text-secondary hover:text-primary-600 transition-colors font-medium">
                    {lang === "ar" ? "الطلبات" : "Orders"}
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleLang} className="text-sm font-medium text-text-secondary hover:text-primary-600 transition-colors px-2 py-1 border border-border rounded">
              {lang === "en" ? "عربي" : "EN"}
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
                        {lang === "ar" ? "الملف الشخصي" : "Profile"}
                      </Link>
                      <Link href="/orders" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-hover">
                        {lang === "ar" ? "طلباتي" : "My Orders"}
                      </Link>
                      {isStaff && (
                        <Link href="/admin" onClick={() => setProfileOpen(false)} className="block px-4 py-2 text-sm text-text-primary hover:bg-surface-hover border-t border-border">
                          {lang === "ar" ? "لوحة التحكم" : "Admin Panel"}
                        </Link>
                      )}
                      <button onClick={() => { setProfileOpen(false); logout(); }} className="w-full text-left px-4 py-2 text-sm text-error hover:bg-red-50 border-t border-border">
                        {lang === "ar" ? "تسجيل الخروج" : "Logout"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm font-medium text-text-secondary hover:text-primary-600 px-3 py-1.5 transition-colors">
                  {lang === "ar" ? "تسجيل الدخول" : "Login"}
                </Link>
                <Link href="/register" className="text-sm font-medium bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors">
                  {lang === "ar" ? "إنشاء حساب" : "Sign Up"}
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
            <Link href="/menu" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:bg-surface-hover rounded-lg">Menu</Link>
            {authed && (
              <>
                <Link href="/cart" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:bg-surface-hover rounded-lg">Cart</Link>
                <Link href="/orders" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-text-secondary hover:bg-surface-hover rounded-lg">Orders</Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
