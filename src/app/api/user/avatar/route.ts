/**
 * POST /api/user/avatar
 * 上传头像 — 接收 multipart/form-data → 存本地 → 更新 users.image
 */

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "avatars");

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

    // 校验类型
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "仅支持 jpg / png / webp / gif" },
        { status: 400 }
      );
    }

    // 校验大小
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "图片不能超过 5MB" },
        { status: 400 }
      );
    }

    // 确保目录存在
    await mkdir(UPLOAD_DIR, { recursive: true });

    // 生成唯一文件名
    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const filename = `${session.user.id}-${Date.now()}.${ext}`;
    const fullPath = path.join(UPLOAD_DIR, filename);

    // 写入文件
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(fullPath, buffer);

    // 更新数据库
    const publicPath = `/uploads/avatars/${filename}`;
    await db
      .update(users)
      .set({ image: publicPath, updatedAt: new Date() })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      ok: true,
      image: publicPath,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Avatar Upload] Error:", message);
    return NextResponse.json(
      { error: "上传失败", detail: message },
      { status: 500 }
    );
  }
}
