"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Turnstile } from "@marsidev/react-turnstile";

export const dynamic = "force-dynamic";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const registered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReady, setTurnstileReady] = useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setFormError(null);

    const result = await signIn("credentials", {
      email,
      password,
      turnstileToken, // NextAuth credentials 会透传到 authorize 回调
      redirect: false,
    });

    if (result?.error) {
      setFormError("邮箱或密码错误");
      setIsLoading(false);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-rose-50 via-white to-amber-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-rose-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            纸片人男友
          </Link>
          <p className="mt-2 text-gray-500 text-sm">登录你的账号</p>
        </div>

        {registered && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-green-50 text-green-600 text-sm text-center">
            注册成功！请登录
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4"
        >
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

          {formError && (
            <div className="px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (turnstileReady && !turnstileToken)}
            className="w-full py-2.5 rounded-xl text-white font-medium text-sm bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "登录中..." : "登录"}
          </button>

          <div className="text-center text-sm text-gray-500">
            还没有账号？{" "}
            <Link href="/register" className="text-purple-500 hover:underline font-medium">
              立即注册
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">加载中...</div>}>
      <LoginForm />
    </Suspense>
  );
}
