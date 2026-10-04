import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Link from "next/link";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/me");

  return (
    <main className="min-h-screen bg-gray-50">
      {/* 顶部返回栏 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div className="max-w-2xl mx-auto flex items-center h-12 px-4">
          <Link href="/" className="p-1 -ml-1 rounded-md hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="flex-1 text-center text-base font-medium text-gray-800">个人资料</h1>
          <div className="w-7" />
        </div>
      </header>

      <ProfileClient
        user={{
          id: session.user.id!,
          name: session.user.name ?? null,
          email: session.user.email ?? null,
          image: session.user.image ?? null,
        }}
      />
    </main>
  );
}
