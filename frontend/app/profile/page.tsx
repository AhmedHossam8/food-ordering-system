"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import Spinner from "@/components/ui/Spinner";
import Badge from "@/components/ui/Badge";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lang, setLang] = useState("en");

  useEffect(() => {
    Promise.all([
      api.get("/api/users/profile/"),
      api.get("/api/users/language/"),
    ]).then(([profileRes, langRes]) => {
      const p = profileRes.data;
      setProfile(p);
      setPhone(p.phone || "");
      setAddress(p.address || "");
      setLang(langRes.data.language);
    }).catch(() => toast.error("Failed to load profile"))
    .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.put("/api/users/profile/", { phone, address });
      toast.success("Profile updated");
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  const updateLang = async (language: string) => {
    try {
      await api.put("/api/users/language/", { language });
      setLang(language);
      toast.success("Language updated");
    } catch { toast.error("Failed to update language"); }
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
          <h2 className="text-lg font-semibold mb-4">Profile Details</h2>
          <div className="space-y-4">
            <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <Input label="Default Address" multiline rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            <Button loading={saving} onClick={saveProfile}>Save Changes</Button>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Language Preference</h2>
          <div className="flex gap-3">
            <button
              onClick={() => updateLang("en")}
              className={`flex-1 px-4 py-3 rounded-xl border text-center transition-all ${lang === "en" ? "border-primary-500 bg-primary-50 text-primary-700 font-medium" : "border-border hover:bg-surface-hover"}`}
            >
              English
            </button>
            <button
              onClick={() => updateLang("ar")}
              className={`flex-1 px-4 py-3 rounded-xl border text-center transition-all ${lang === "ar" ? "border-primary-500 bg-primary-50 text-primary-700 font-medium" : "border-border hover:bg-surface-hover"}`}
            >
              العربية
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
