"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { useLanguage } from "@/lib/language";
import toast from "react-hot-toast";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function LoginPage() {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/users/login/", { username, password });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      const profile = await api.get("/api/users/profile/");
      setAuth(
        { id: profile.data.user.id, username, email: profile.data.user.email },
        data.access, data.refresh,
      );
      toast.success(t("login.success"));
      router.push("/menu");
    } catch (err: any) {
      const data = err.response?.data;
      const msg = data?.detail || (data ? JSON.stringify(data) : err.message) || t("login.error");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">{t("login.title")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("login.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("login.username")} value={username} onChange={(e) => { setUsername(e.target.value); setErrors((e) => ({ ...e, username: "" })); setFormError(""); }} required autoComplete="username" error={errors.username} />
          <Input label={t("login.password")} type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((e) => ({ ...e, password: "" })); setFormError(""); }} required autoComplete="current-password" error={errors.password} showPasswordToggle />
          {formError && <p className="text-sm text-error text-center">{formError}</p>}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {t("login.btn")}
          </Button>
        </form>
        <div className="mt-6 text-center space-y-2">
          <Link href="/forgot-password" className="block text-sm text-primary-600 hover:underline">
            {t("login.forgot")}
          </Link>
          <p className="text-sm text-text-secondary">
            {t("login.no_account")}{" "}
            <Link href="/register" className="text-primary-600 hover:underline font-medium">{t("login.signup_link")}</Link>
          </p>
        </div>
      </Card>
    </div>
  );
}
