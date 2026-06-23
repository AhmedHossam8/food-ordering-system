"use client";
import { useState } from "react";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    if (!email.includes("@")) { setEmailError("Enter a valid email"); return; }
    setLoading(true);
    try {
      await api.post("/api/users/password-reset/", { email });
      setSent(true);
      toast.success(t("forgot.success"));
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.email) setEmailError(Array.isArray(data.email) ? data.email[0] : data.email);
      else toast.error(t("forgot.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">{t("forgot.title")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("forgot.subtitle")}</p>
        </div>
        {sent ? (
          <div className="text-center">
            <p className="text-success font-medium mb-4">{t("forgot.sent_msg")}</p>
            <Button href="/login" variant="outline">{t("forgot.back")}</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label={t("forgot.email")} type="email" value={email} onChange={(e) => { setEmail(e.target.value); setEmailError(""); }} required autoComplete="email" error={emailError} />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              {t("forgot.btn")}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
