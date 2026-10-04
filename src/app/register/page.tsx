"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";

export const dynamic = "force-dynamic";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, turnstileToken }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "注册失败");
        setIsLoading(false);
        return;
      }

      // 注册成功，跳登录页（带上 registered=true 让登录页显示提示）
      router.push("/login?registered=true");
    } catch {
      setError("网络错误，请稍后重试");
      setIsLoading(false);
    }
  };

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 via-white to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            纸片人男友
          </Link>
          <p className="mt-2 text-gray-500 text-sm">创建你的账号</p>
        </div>

        {searchParams.get("registered") && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 text-green-600 text-sm text-center">
            注册成功！请登录
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-0 outline-none text-sm disabled:opacity-50"
              placeholder="你想让他叫你什么？"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-0 outline-none text-sm disabled:opacity-50"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              disabled={isLoading}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-purple-400 focus:ring-0 outline-none text-sm disabled:opacity-50"
              placeholder="至少 6 位"
            />
          </div>

          {/* Turnstile 人机验证 */}
          {siteKey && (
            <div className="flex justify-center py-1">
              <Turnstile
                siteKey={siteKey}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => { setTurnstileToken(null); setTurnstileReady(false); }}
                onExpire={() => setTurnstileToken(null)}
                onLoad={() => setTurnstileReady(true)}
              />
            </div>
          )}

          {error && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (turnstileReady && !turnstileToken)}
            className="w-full py-2.5 rounded-xl text-white font-medium text-sm bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "注册中..." : "创建账号"}
          </button>

          <div className="text-center text-sm text-gray-500">
            已有账号？{" "}
            <Link href="/login" className="text-purple-500 hover:underline font-medium">
              去登录
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
