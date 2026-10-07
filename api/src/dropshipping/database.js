import { Pool } from "pg";

let pool;
function connectionString() { return process.env.DATABASE_URL || process.env.POSTGRES_URL || ""; }
export function dropshippingPool() {
  if (!connectionString()) throw Object.assign(new Error("PostgreSQL DATABASE_URL is not configured."), { statusCode: 503 });
  if (!pool) pool = new Pool({ connectionString: connectionString(), ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined });
  return pool;
}
export function dropshippingQuery(text, values = []) { return dropshippingPool().query(text, values); }
export async function withDropshippingTransaction(work) {
  const client = await dropshippingPool().connect();
  try { await client.query("begin"); const result = await work(client); await client.query("commit"); return result; }
  catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

