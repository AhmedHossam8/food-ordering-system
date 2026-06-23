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

export default function RegisterPage() {
  const { t } = useLanguage();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError("");
    if (password !== confirmPassword) {
      setErrors((e) => ({ ...e, confirmPassword: t("reset.mismatch") }));
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/users/register/", { username, email, password });
      const { data } = await api.post("/api/users/login/", { username, password });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      const profile = await api.get("/api/users/profile/");
      const setAuth = useAuthStore.getState().setAuth;
      setAuth(
        { id: profile.data.user.id, username, email: profile.data.user.email },
        data.access, data.refresh,
      );
      toast.success(t("login.success"));
      router.push("/menu");
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.username) setErrors((e) => ({ ...e, username: Array.isArray(data.username) ? data.username[0] : data.username }));
      if (data?.email) setErrors((e) => ({ ...e, email: Array.isArray(data.email) ? data.email[0] : data.email }));
      if (data?.password) setErrors((e) => ({ ...e, password: Array.isArray(data.password) ? data.password[0] : data.password }));
      const firstFieldError = data?.username?.[0] || data?.email?.[0] || data?.password?.[0];
      const msg = data?.detail || firstFieldError || t("register.error");
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
          <h1 className="text-2xl font-bold text-text-primary">{t("register.title")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("register.subtitle")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("register.username")} value={username} onChange={(e) => { setUsername(e.target.value); setErrors((e) => ({ ...e, username: "" })); setFormError(""); }} required autoComplete="username" error={errors.username} />
          <Input label={t("register.email")} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErrors((e) => ({ ...e, email: "" })); setFormError(""); }} required autoComplete="email" error={errors.email} />
          <Input label={t("register.password")} type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((e) => ({ ...e, password: "" })); setFormError(""); }} required minLength={8} autoComplete="new-password" error={errors.password} showPasswordToggle />
          <Input label={t("register.confirm_password")} type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setErrors((e) => ({ ...e, confirmPassword: "" })); setFormError(""); }} required autoComplete="new-password" error={errors.confirmPassword} showPasswordToggle />
          {formError && <p className="text-sm text-error text-center">{formError}</p>}
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {t("register.btn")}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-text-secondary">
          {t("register.has_account")}{" "}
          <Link href="/login" className="text-primary-600 hover:underline font-medium">{t("register.login_link")}</Link>
        </p>
      </Card>
    </div>
  );
}
