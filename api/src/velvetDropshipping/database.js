import { Pool } from "pg";

let pool;

function connectionString() {
  return process.env.VELVET_DATABASE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
}

export function velvetPool() {
  if (!connectionString()) {
    throw Object.assign(new Error("PostgreSQL DATABASE_URL is not configured."), { statusCode: 503 });
  }
  if (!pool) {
    pool = new Pool({
      connectionString: connectionString(),
      ssl: process.env.POSTGRES_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export function velvetQuery(text, values = []) {
  return velvetPool().query(text, values);
}

export async function recordAudit(client, event) {
  const run = client?.query ? (text, values) => client.query(text, values) : velvetQuery;
  await run(
    `insert into public.velvet_dropship_audit_events
       (company_id, actor_user_id, action, entity_type, entity_id, payload)
     values ($1,$2,$3,$4,$5,$6::jsonb)`,
    [
      event.companyId,
      event.actorUserId || null,
      event.action,
      event.entityType,
      event.entityId == null ? null : String(event.entityId),
      JSON.stringify(event.payload || {}),
    ],
  );
}

export async function withVelvetTransaction(work) {
  const client = await velvetPool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
