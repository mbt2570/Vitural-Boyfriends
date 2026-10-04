import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit 默认读 .env，Next.js 项目用 .env.local，需显式指定
config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
