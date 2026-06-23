"use client";
import { useState } from "react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/users/password-reset/", { email });
      setSent(true);
      toast.success("Reset link sent if email exists");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <span className="text-4xl">🔑</span>
          <h1 className="text-2xl font-bold text-text-primary mt-2">Reset Password</h1>
          <p className="text-text-secondary text-sm mt-1">Enter your email to receive a reset link</p>
        </div>
        {sent ? (
          <div className="text-center">
            <p className="text-success font-medium mb-4">Check your email for the reset link.</p>
            <Button href="/login" variant="outline">Back to Login</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Send Reset Link
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
