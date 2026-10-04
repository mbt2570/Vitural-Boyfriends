"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";

interface Props {
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function ProfileClient({ user }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(user.image);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 本地预览
    const previewUrl = URL.createObjectURL(file);
    setImageUrl(previewUrl);
    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || "上传失败");
      }

      // 用服务器返回的 URL 替换本地预览
      setImageUrl(data.image);
      setMessage({ type: "ok", text: "头像更新成功 ✅" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "上传失败";
      setMessage({ type: "err", text: msg });
      setImageUrl(user.image); // 回退
    } finally {
      setIsUploading(false);
      URL.revokeObjectURL(previewUrl);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 头像区 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
        <div className="flex items-center gap-5">
          {/* 头像 + 上传按钮 */}
          <div className="relative group">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={isUploading}
              className="relative block w-20 h-20 rounded-full overflow-hidden bg-gray-100 ring-2 ring-gray-200 hover:ring-purple-300 transition-all disabled:opacity-60"
              title="点击更换头像"
            >
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt="头像"
                  fill
                  sizes="80px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  点击上传
                </div>
              )}

              {/* hover 遮罩 */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs">更换头像</span>
              </div>

              {isUploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </button>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* 用户信息 */}
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-gray-800 truncate">
              {user.name ?? "未设置昵称"}
            </h2>
            <p className="text-sm text-gray-500 truncate">{user.email ?? ""}</p>
            <p className="text-[11px] text-gray-400 mt-1">
              点击头像可上传新头像（支持 jpg / png / webp，最大 5MB）
            </p>
          </div>
        </div>

        {/* 提示消息 */}
        {message && (
          <div
            className={`mt-4 px-3 py-2 rounded-lg text-sm ${
              message.type === "ok"
                ? "bg-green-50 text-green-600"
                : "bg-red-50 text-red-600"
            }`}
          >
            {message.text}
          </div>
        )}
      </div>

      {/* 其他信息卡片（占位，后续扩展） */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-gray-700">昵称</span>
          <span className="text-sm text-gray-500">{user.name ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-sm text-gray-700">邮箱</span>
          <span className="text-sm text-gray-500">{user.email ?? "—"}</span>
        </div>
      </div>

      {/* 退出登录 */}
      <div className="mt-6">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full py-3 rounded-2xl text-sm text-red-500 bg-white border border-gray-100 hover:bg-red-50 transition-colors"
        >
          退出登录
        </button>
      </div>
    </div>
  );
}
