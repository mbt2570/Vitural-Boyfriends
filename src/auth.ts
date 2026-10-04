/**
 * NextAuth v5 配置 — Credentials Provider
 *
 * 使用 JWT session（不需要 adapter 持久化），
 * authorize 回调对接现有 users 表 + bcrypt 密码验证
 */

import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "邮箱", type: "email", placeholder: "you@example.com" },
        password: { label: "密码", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);

        // 查询用户
        const result = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        const user = result[0];
        if (!user || !user.password) return null;

        // 验证密码
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image ?? null,
        };
      },
    }),
  ],
  callbacks: {
    // 将 user 信息写入 JWT（登录时触发一次）
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image ?? null;
      }
      return token;
    },
    // 将 JWT 信息暴露给 session
    // 每次访问都查一下 DB 拿最新的 image，确保上传后立即生效
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = (token.name as string) ?? session.user.name ?? null;
        session.user.email = (token.email as string) ?? session.user.email ?? null;

        // 动态查库拿最新 image
        try {
          if (session.user.id) {
            const result = await db
              .select({ image: users.image })
              .from(users)
              .where(eq(users.id, session.user.id))
              .limit(1);
            session.user.image = result[0]?.image ?? (token.image as string | null) ?? null;
          }
        } catch {
          // DB 查失败则用 JWT 里的值兜底
          session.user.image = (token.image as string) ?? null;
        }
      }
      return session;
    },
  },
});

// 扩展 NextAuth 类型
declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id?: string;
    };
  }
}
