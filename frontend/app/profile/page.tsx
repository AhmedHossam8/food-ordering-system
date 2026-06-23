"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import { useAuthStore } from "@/lib/store";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";

export default function ProfilePage() {
  const { lang, setLang, t } = useLanguage();
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    api.get("/api/users/profile/").then(({ data }) => {
      setProfile(data);
      setPhone(data.phone || "");
      setAddress(data.address || "");
    }).catch(() => toast.error(t("profile.load_error")))
    .finally(() => setLoading(false));
  }, [t]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put("/api/users/profile/", { phone, address });
      toast.success(t("profile.saved"));
    } catch { toast.error(t("profile.save_error")); }
    finally { setSaving(false); }
  };

  const updateLangHandler = async (language: string) => {
    setLang(language);
    try {
      await api.put("/api/users/language/", { language });
      toast.success(t("profile.lang_updated"));
    } catch { toast.error(t("profile.lang_error")); }
  };

  const handleDeleteAccount = async () => {
    if (!confirm(t("profile.delete_confirm"))) return;
    try {
      await api.delete("/api/users/delete-account/");
      toast.success(t("profile.deleted"));
      logout();
      router.push("/");
    } catch {
      toast.error(t("profile.delete_error"));
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-2xl font-bold">
          {profile?.user?.username?.[0]?.toUpperCase() || "U"}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{profile?.user?.username}</h1>
          <p className="text-text-secondary">{profile?.user?.email}</p>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t("profile.details")}</h2>
          <div className="space-y-4">
            <Input label={t("profile.phone")} value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label={t("profile.address")} multiline rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            <Button loading={saving} onClick={saveProfile}>{t("profile.save")}</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">{t("profile.language")}</h2>
          <div className="flex gap-3">
            <button
              onClick={() => updateLangHandler("en")}
              className={`flex-1 px-4 py-3 rounded-xl border text-center transition-all ${lang === "en" ? "border-primary-500 bg-primary-50 text-primary-700 font-medium" : "border-border hover:bg-surface-hover"}`}
            >
              {t("profile.english")}
            </button>
            <button
              onClick={() => updateLangHandler("ar")}
              className={`flex-1 px-4 py-3 rounded-xl border text-center transition-all ${lang === "ar" ? "border-primary-500 bg-primary-50 text-primary-700 font-medium" : "border-border hover:bg-surface-hover"}`}
            >
              {t("profile.arabic")}
            </button>
          </div>
        </Card>

        <Card className="p-6 border-error/30">
          <h2 className="text-lg font-semibold text-error mb-4">{t("profile.delete_account")}</h2>
          <p className="text-sm text-text-secondary mb-4">{t("profile.delete_confirm")}</p>
          <Button onClick={handleDeleteAccount} className="bg-error hover:bg-red-700 text-white">
            {t("profile.delete_account")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
