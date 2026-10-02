import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrations need a session connection (Supabase: DIRECT_URL, session pooler); locally DATABASE_URL is fine
  dbCredentials: { url: (process.env.DIRECT_URL || process.env.DATABASE_URL)! },
});
