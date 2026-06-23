"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import Modal from "@/components/ui/Modal";

interface MenuItem {
  id: number; category: number; category_name: string;
  name: string; name_ar: string;
  description: string; description_ar: string;
  price: string; image: string | null;
  is_available: boolean; stock: number;
}

interface Category {
  id: number; name: string;
}

const emptyItem = {
  category: 0, name: "", name_ar: "", description: "", description_ar: "",
  price: "", image: "", is_available: true, stock: 0,
};

export default function AdminMenuPage() {
  const { t } = useLanguage();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [form, setForm] = useState(emptyItem);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const { data } = await api.get("/api/menu/items/", { params });
      setItems(data.results || data);
    } catch {}
    finally { setLoading(false); }
  }, [search]);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get("/api/menu/categories/");
      setCategories(data.results || data);
    } catch {}
  }, []);

  useEffect(() => { fetchCategories(); }, []);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyItem);
    setModalOpen(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditing(item);
    setForm({
      category: item.category,
      name: item.name,
      name_ar: item.name_ar,
      description: item.description,
      description_ar: item.description_ar,
      price: item.price,
      image: item.image || "",
      is_available: item.is_available,
      stock: item.stock,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, image: form.image || null };
      if (editing) {
        await api.put(`/api/menu/items/${editing.id}/`, payload);
      } else {
        await api.post("/api/menu/items/", payload);
      }
      setModalOpen(false);
      fetchItems();
    } catch {}
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("admin_menu.confirm_delete"))) return;
    try {
      await api.delete(`/api/menu/items/${id}/`);
      fetchItems();
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t("admin_menu.title")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("admin_menu.subtitle")}</p>
        </div>
        <div className="flex gap-3">
          <Link href="/admin/categories" className="text-sm font-medium text-primary-600 hover:text-primary-700 px-4 py-2 border border-border rounded-lg hover:bg-surface-hover transition-colors">
            {t("admin.manage_categories")}
          </Link>
          <Link href="/admin" className="text-sm text-primary-600 hover:underline self-center">
            {t("admin_orders.back")}
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder={t("admin_menu.search")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchItems()}
          className="flex-1 px-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Button onClick={openAdd}>{t("admin_menu.add")}</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : items.length === 0 ? (
        <p className="text-center py-16 text-text-secondary">{t("admin_menu.no_items")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-text-secondary">{t("admin_menu.name")}</th>
                <th className="text-left py-3 px-4 font-medium text-text-secondary">{t("admin_menu.category")}</th>
                <th className="text-right py-3 px-4 font-medium text-text-secondary">{t("admin_menu.price")}</th>
                <th className="text-center py-3 px-4 font-medium text-text-secondary">{t("admin_menu.stock")}</th>
                <th className="text-center py-3 px-4 font-medium text-text-secondary">{t("admin_menu.available")}</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-surface-hover transition-colors">
                  <td className="py-3 px-4 font-medium">{item.name}</td>
                  <td className="py-3 px-4 text-text-secondary">{item.category_name}</td>
                  <td className="py-3 px-4 text-right font-medium">${item.price}</td>
                  <td className="py-3 px-4 text-center text-text-secondary">{item.stock === 0 ? "\u221E" : item.stock}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${item.is_available ? "bg-green-500" : "bg-red-400"}`} />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(item)} className="text-primary-600 hover:underline text-xs font-medium">
                        {t("admin_menu.edit")}
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="text-error hover:underline text-xs font-medium">
                        {t("admin_menu.delete")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? t("admin_menu.edit_title") : t("admin_menu.add_title")}>
        <div className="space-y-4">
          <Input label={t("admin_menu.name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label={t("admin_menu.name_ar")} value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
          <Input label={t("admin_menu.description")} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} multiline />
          <Input label={t("admin_menu.description_ar")} value={form.description_ar} onChange={(e) => setForm({ ...form, description_ar: e.target.value })} multiline />
          <div className={""}>
            <label className="block text-sm font-medium text-text-primary mb-1.5">{t("admin_menu.category")}</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: Number(e.target.value) })}
              className="w-full px-4 py-2.5 bg-white border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value={0} disabled>Select...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <Input label={t("admin_menu.price")} type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
          <Input label={t("admin_menu.stock")} type="number" value={String(form.stock)} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
          <Input label={t("admin_menu.image")} value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_available}
              onChange={(e) => setForm({ ...form, is_available: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-border rounded focus:ring-primary-500"
            />
            <span className="text-sm text-text-primary">{t("admin_menu.available")}</span>
          </label>
          <div className="flex gap-3 pt-2">
            <Button onClick={handleSave} loading={saving} className="flex-1">{t("admin_menu.save")}</Button>
            <Button onClick={() => setModalOpen(false)} variant="outline" className="flex-1">{t("admin_menu.cancel")}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
