/**
 * POST /api/upload/chat-image
 * 上传聊天图片 — 存 public/uploads/chat/ → 返回公开路径
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB（聊天图片比头像大一点）
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "chat");

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "缺少 file 字段" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "仅支持 jpg / png / webp / gif" },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "图片不能超过 10MB" },
        { status: 400 }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const filename = `${session.user.id}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 6)}.${ext}`;
    const fullPath = path.join(UPLOAD_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    const publicPath = `/uploads/chat/${filename}`;

    return NextResponse.json({
      ok: true,
      url: publicPath,
      size: file.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Chat Image Upload] Error:", message);
    return NextResponse.json(
      { error: "上传失败", detail: message },
      { status: 500 }
    );
  }
}
