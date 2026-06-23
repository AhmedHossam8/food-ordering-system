"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useLanguage } from "@/lib/language";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";

interface User {
  id: number; username: string; email: string; is_staff: boolean;
}

export default function AdminUsersPage() {
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/users/");
      setUsers(data.results || data);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, []);

  const toggleStaff = async (user: User) => {
    try {
      await api.patch(`/api/admin/users/${user.id}/toggle-staff/`);
      toast.success(user.is_staff ? t("admin_users.staff_off") : t("admin_users.staff_on"));
      fetchUsers();
    } catch {}
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">{t("admin_users.title")}</h1>
          <p className="text-text-secondary text-sm mt-1">{t("admin_users.subtitle")}</p>
        </div>
        <Link href="/admin" className="text-sm text-primary-600 hover:underline">{t("admin_orders.back")}</Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner className="h-8 w-8" /></div>
      ) : users.length === 0 ? (
        <p className="text-center py-16 text-text-secondary">{t("admin_users.no_users")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-medium text-text-secondary">{t("admin_users.id")}</th>
                <th className="text-left py-3 px-4 font-medium text-text-secondary">{t("admin_users.username")}</th>
                <th className="text-left py-3 px-4 font-medium text-text-secondary">{t("admin_users.email")}</th>
                <th className="text-center py-3 px-4 font-medium text-text-secondary">{t("admin_users.staff")}</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-surface-hover transition-colors">
                  <td className="py-3 px-4 font-medium text-text-secondary">{u.id}</td>
                  <td className="py-3 px-4 font-medium">{u.username}</td>
                  <td className="py-3 px-4 text-text-secondary">{u.email || "\u2014"}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${u.is_staff ? "bg-green-500" : "bg-gray-300"}`} />
                  </td>
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleStaff(u)}
                      className={`text-xs font-medium hover:underline ${u.is_staff ? "text-error" : "text-primary-600"}`}
                    >
                      {u.is_staff ? t("admin_users.toggle_staff") : t("admin_users.toggle_staff")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
