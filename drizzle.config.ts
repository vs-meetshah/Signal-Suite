import "dotenv/config";
import { defineConfig } from "drizzle-kit";
const env = (globalThis as any).process?.env ?? {};

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: env.DATABASE_URL!,
    ssl: true,
  },
});