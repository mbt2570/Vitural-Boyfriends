/**
 * POST /api/auth/register
 * 注册新用户 — 写入 users 表，密码 bcrypt 加密
 */

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password } = body;

    // 基础校验
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "name, email, password 必填" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少 6 位" },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedName = String(name).trim();

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
        { status: 400 }
      );
    }

    // 检查邮箱是否已注册
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "该邮箱已注册" },
        { status: 409 }
      );
    }

    // 加密密码并写入
    const hashedPassword = await bcrypt.hash(String(password), 10);

    const result = await db
      .insert(users)
      .values({
        name: normalizedName,
        email: normalizedEmail,
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: users.id, name: users.name, email: users.email });

    return NextResponse.json(
      { ok: true, user: result[0] },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[Register] Error:", message);
    return NextResponse.json(
      { error: "注册失败", detail: message },
      { status: 500 }
    );
  }
}
