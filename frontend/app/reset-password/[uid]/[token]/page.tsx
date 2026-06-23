"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const { uid, token } = useParams();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    if (password !== confirm) {
      setErrors({ confirm: t("reset.mismatch") });
      return;
    }
    setLoading(true);
    try {
      await api.post(`/api/users/password-reset/confirm/${uid}/${token}/`, {
        new_password1: password,
        new_password2: confirm,
      });
      toast.success(t("reset.success"));
      router.push("/login");
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.new_password1) setErrors((e) => ({ ...e, password: Array.isArray(data.new_password1) ? data.new_password1[0] : data.new_password1 }));
      if (data?.new_password2) setErrors((e) => ({ ...e, confirm: Array.isArray(data.new_password2) ? data.new_password2[0] : data.new_password2 }));
      if (data?.__all__) toast.error(Array.isArray(data.__all__) ? data.__all__[0] : data.__all__);
      if (!data?.new_password1 && !data?.new_password2 && !data?.__all__) {
        toast.error(t("reset.error"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-text-primary">{t("reset.title")}</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label={t("reset.new_password")} type="password" value={password} onChange={(e) => { setPassword(e.target.value); setErrors((e) => ({ ...e, password: "" })); }} required minLength={8} autoComplete="new-password" error={errors.password} showPasswordToggle />
          <Input label={t("reset.confirm")} type="password" value={confirm} onChange={(e) => { setConfirm(e.target.value); setErrors((e) => ({ ...e, confirm: "" })); }} required autoComplete="new-password" error={errors.confirm} showPasswordToggle />
          <Button type="submit" className="w-full" size="lg" loading={loading}>
            {t("reset.btn")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
