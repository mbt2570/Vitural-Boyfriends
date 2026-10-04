/**
 * 数据库连接 — Drizzle ORM + postgres (neon serverless)
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env.local");
}

// 在 Next.js 中，Serverless/Edge Runtime 需要 postgres-js
// connection: idle_timeout 默认 30s，Neon 建议 15s 以减少连接堆积
const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  connect_timeout: 10,
  idle_timeout: 15,
  ssl: "require",
});

export const db = drizzle(client, { schema });

// 方便按需关闭（比如测试脚本）
export async function closeDb() {
  await client.end();
}
