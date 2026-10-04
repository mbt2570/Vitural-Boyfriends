"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

type SessionUser = {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export function HeaderAuth({
  session,
}: {
  session: { user: SessionUser } | null;
}) {
  if (session?.user) {
    return (
      <div className="absolute top-4 right-6 flex items-center gap-3 text-sm">
        <Link href="/me" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-white shadow-sm">
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt="我的头像"
                width={32}
                height={32}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                {session.user.name?.[0] ?? "我"}
              </div>
            )}
          </div>
        </Link>
        <span className="text-gray-500 hidden sm:inline">
          你好，<span className="text-gray-800 font-medium">{session.user.name ?? session.user.email}</span>
        </span>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors text-xs"
        >
          退出
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 right-6 flex items-center gap-2 text-sm">
      <Link
        href="/login"
        className="px-3 py-1.5 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors text-xs"
      >
        登录
      </Link>
      <Link
        href="/register"
        className="px-3 py-1.5 rounded-lg text-white text-xs bg-gradient-to-r from-purple-500 to-indigo-500 hover:opacity-90 transition-opacity"
      >
        注册
      </Link>
    </div>
  );
}
