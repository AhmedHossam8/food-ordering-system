"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import toast from "react-hot-toast";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";

interface Category {
  id: number; name: string; name_ar: string;
  description: string; description_ar: string;
  display_order: number;
}

const emptyCat = { name: "", name_ar: "", description: "", description_ar: "", display_order: 0 };

export default function AdminCategoriesPage() {
  const { t, lang } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState(emptyCat);
  const [saving, setSaving] = useState(false);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/menu/categories/");
      setCategories(data.results || data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCategories(); }, [lang]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyCat);
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    setForm({
      name: cat.name,
      name_ar: cat.name_ar,
      description: cat.description,
      description_ar: cat.description_ar,
      display_order: cat.display_order,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error(t("admin_cat.name_required")); return; }
    setSaving(true);
    try {
      if (editing) {
        const { data } = await api.put(`/api/menu/categories/${editing.id}/`, form);
        setCategories((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...data } : c)));
      } else {
        const { data } = await api.post("/api/menu/categories/", form);
        setCategories((prev) => [...prev, data]);
      }
      setModalOpen(false);
      toast.success(editing ? t("admin_cat.updated") : t("admin_cat.created"));
    } catch (e: unknown) {
      const msg = (e as any)?.response?.data?.name?.[0] || (e as any)?.response?.data?.detail || t("admin_cat.save_error");
      toast.error(msg);
    }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("admin_cat.confirm_delete"))) return;
    try {
      await api.delete(`/api/menu/categories/${id}/`);
      toast.success(t("admin_cat.deleted"));
      fetchCategories();
    } catch { toast.error(t("admin_cat.delete_error")); }
  };

  const moveUp = async (cat: Category, index: number) => {
    if (index === 0) return;
    const prev = categories[index - 1];
    try {
      await api.put(`/api/menu/categories/${cat.id}/`, { ...cat, display_order: prev.display_order });
      await api.put(`/api/menu/categories/${prev.id}/`, { ...prev, display_order: cat.display_order });
      toast.success(t("admin_cat.reordered"));
      fetchCategories();
    } catch { toast.error(t("admin_cat.reorder_error")); }
  };

  const moveDown = async (cat: Category, index: number) => {
    if (index === categories.length - 1) return;
    const next = categories[index + 1];
    try {
      await api.put(`/api/menu/categories/${cat.id}/`, { ...cat, display_order: next.display_order });
      await api.put(`/api/menu/categories/${next.id}/`, { ...next, display_order: cat.display_order });
      toast.success(t("admin_cat.reordered"));
      fetchCategories();
    } catch { toast.error(t("admin_cat.reorder_error")); }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t("admin_cat.title")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("admin_cat.subtitle")}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/menu" className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2 border border-border rounded-lg hover:bg-surface-hover transition-colors">
            {t("admin.manage_menu")}
          </Link>
          <Link href="/admin" className="text-sm text-primary-600 hover:underline self-center">{t("admin_orders.back")}</Link>
        </div>
      </div>

      <div className="mb-6">
        <Button onClick={openAdd}>{t("admin_cat.add")}</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : categories.length === 0 ? (
        <p className="text-center py-16 text-text-secondary">{t("admin_cat.no_cats")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-start py-3 px-4 font-medium text-text-secondary">#</th>
                <th className="text-start py-3 px-4 font-medium text-text-secondary">{t("admin_cat.name")}</th>
                <th className="text-start py-3 px-4 font-medium text-text-secondary">{t("admin_cat.name_ar")}</th>
                <th className="text-center py-3 px-4 font-medium text-text-secondary">{t("admin_cat.display_order")}</th>
                <th className="text-center py-3 px-4 font-medium text-text-secondary">{t("admin_cat.reorder")}</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {categories.map((cat, index) => (
                <tr key={cat.id} className="hover:bg-surface-hover transition-colors">
                  <td className="py-3 px-4 font-medium text-text-secondary">{cat.id}</td>
                  <td className="py-3 px-4 font-medium">{cat.name}</td>
                  <td className="py-3 px-4 text-text-secondary">{cat.name_ar || "\u2014"}</td>
                  <td className="py-3 px-4 text-center text-text-secondary">{cat.display_order}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => moveUp(cat, index)} disabled={index === 0} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed" title={t("admin_cat.move_up")}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                      </button>
                      <button onClick={() => moveDown(cat, index)} disabled={index === categories.length - 1} className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed" title={t("admin_cat.move_down")}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(cat)} className="text-primary-600 hover:underline text-xs font-medium">
                        {t("admin_cat.edit")}
                      </button>
                      <button onClick={() => handleDelete(cat.id)} className="text-error hover:underline text-xs font-medium">
                        {t("admin_cat.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t("admin_cat.edit_title") : t("admin_cat.add_title")}>
        <div className="space-y-4">
          <Input label={t("admin_cat.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label={t("admin_cat.name_ar")} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          <Input label={t("admin_cat.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline />
          <Input label={t("admin_cat.description_ar")} value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} multiline />
          <Input label={t("admin_cat.display_order")} type="number" value={String(form.display_order)} onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })} />
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">{t("admin_cat.save")}</Button>
            <Button onClick={() => setModalOpen(false)} variant="outline" className="flex-1">{t("admin_cat.cancel")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
