/**
 * Checks the app's own DB connection (DATABASE_URL) end to end.
 * Run: npx tsx scripts/db-check.ts
 */
import "dotenv/config";
import { TLSSocket } from "node:tls";
import { sql } from "drizzle-orm";
import { db } from "../src/db";

async function main() {
  const host = new URL(process.env.DATABASE_URL!).host;
  const [{ users, plans }] = (
    await db.execute(sql`select (select count(*) from "user")::int as users, (select count(*) from training_plans)::int as plans`)
  ).rows as { users: number; plans: number }[];
  // Encryption of the app -> server hop (pg_stat_ssl would describe the pooler -> Postgres hop instead)
  const client = await db.$client.connect();
  const socket = (client as unknown as { connection: { stream: unknown } }).connection.stream;
  const encrypted = socket instanceof TLSSocket;
  client.release();
  console.log(`host ${host}: ${users} user(s), ${plans} plan(s), encrypted=${encrypted}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("DB check failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
