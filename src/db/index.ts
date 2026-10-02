import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// Reuse the pool across hot reloads in dev
const globalForDb = globalThis as unknown as { pgPool?: Pool };

const url = process.env.DATABASE_URL ?? "";
const isLocal = /@(localhost|127\.0\.0\.1|db)(:\d+)?\//.test(url);

const pool =
  globalForDb.pgPool ??
  new Pool({
    connectionString: url,
    // Remote databases (Supabase) must be encrypted. node-postgres doesn't encrypt by default,
    // and Supabase's pooler certificate isn't in Node's trust store, so we encrypt without
    // verifying the chain (same as psql's default "sslmode=require").
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
    max: 10,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgPool = pool;

export const db = drizzle(pool, { schema });
export { schema };
