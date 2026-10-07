import "dotenv/config";
import { Pool } from "pg";
import { hashPassword } from "../src/auth/passwords.js";
import { DEFAULT_COMPANY_ID } from "../src/tenancy/company.js";

const email = String(process.env.ADMIN_RESET_EMAIL || "").trim().toLowerCase();
const password = String(process.env.ADMIN_RESET_PASSWORD || "");
const requestedRole = String(process.env.ADMIN_RESET_ROLE || "keep").trim().toLowerCase();
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";

// Do not retain the plaintext password in process.env after reading it.
delete process.env.ADMIN_RESET_PASSWORD;

const allowedRoles = new Set(["keep", "super_admin", "admin", "company_admin"]);

function safeError(message) {
  const error = new Error(message);
  error.safeForCli = true;
  return error;
}

function validateInputs() {
  if (!databaseUrl) {
    throw safeError("DATABASE_URL or POSTGRES_URL is required.");
  }
  if (!email) throw safeError("ADMIN_RESET_EMAIL is required.");
  if (!password) throw safeError("ADMIN_RESET_PASSWORD is required.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw safeError("ADMIN_RESET_EMAIL must be a valid email address.");
  }
  if (!allowedRoles.has(requestedRole)) {
    throw safeError(
      "ADMIN_RESET_ROLE must be keep, super_admin, admin, or company_admin.",
    );
  }
  if (password.length < 14 || password.length > 128) {
    throw safeError("ADMIN_RESET_PASSWORD must be between 14 and 128 characters.");
  }
  if (
    !/[a-z]/.test(password)
    || !/[A-Z]/.test(password)
    || !/[0-9]/.test(password)
    || !/[^A-Za-z0-9]/.test(password)
  ) {
    throw safeError(
      "ADMIN_RESET_PASSWORD must include lowercase, uppercase, number, and symbol characters.",
    );
  }
}

function membershipRoleFor(role) {
  return role === "super_admin" ? "super_admin" : "company_admin";
}

async function resetPassword() {
  validateInputs();

  const passwordHash = await hashPassword(password);
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.POSTGRES_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined,
  });
  let client;

  try {
    client = await pool.connect();
    await client.query("begin");

    const matches = await client.query(
      `select id, role, is_active
         from public.users
        where lower(btrim(email)) = $1
        for update`,
      [email],
    );

    if (matches.rowCount === 0) {
      throw safeError("No user matches ADMIN_RESET_EMAIL. No changes were made.");
    }
    if (matches.rowCount !== 1) {
      throw safeError(
        "Multiple users match ADMIN_RESET_EMAIL. Resolve duplicate identities first.",
      );
    }

    const user = matches.rows[0];
    if (user.is_active === false) {
      throw safeError("The matching user is inactive. No changes were made.");
    }

    if (requestedRole !== "keep") {
      const company = await client.query(
        "select id from public.companies where id = $1 for share",
        [DEFAULT_COMPANY_ID],
      );
      if (company.rowCount !== 1) {
        throw safeError("The EB Chemical company record is missing. No changes were made.");
      }

      await client.query(
        `insert into public.company_memberships
          (id, company_id, user_id, role, permissions, is_active, created_at, updated_at)
         values ($1, $2, $3, $4, '[]'::jsonb, true, now(), now())
         on conflict (company_id, user_id) do update
           set role = excluded.role,
               is_active = true,
               updated_at = now()`,
        [
          `${DEFAULT_COMPANY_ID}:${user.id}`,
          DEFAULT_COMPANY_ID,
          user.id,
          membershipRoleFor(requestedRole),
        ],
      );

      await client.query(
        "update public.users set role = $1, updated_at = now() where id = $2",
        [requestedRole, user.id],
      );
    }

    const updated = await client.query(
      "update public.users set password = $1, updated_at = now() where id = $2",
      [passwordHash, user.id],
    );
    if (updated.rowCount !== 1) {
      throw safeError("The password update did not affect exactly one user.");
    }

    await client.query("commit");
    console.log(requestedRole === "keep"
      ? "Admin password reset successfully; role and membership were unchanged."
      : "Admin password and explicitly requested role were updated successfully.");
  } catch (error) {
    if (client) {
      try {
        await client.query("rollback");
      } catch {
        // The caller receives a generic failure below; never print connection details.
      }
    }
    throw error;
  } finally {
    client?.release();
    await pool.end();
  }
}

resetPassword().catch((error) => {
  if (error?.safeForCli) {
    console.error(`Admin password reset failed: ${error.message}`);
  } else {
    console.error("Admin password reset failed. Review the trusted deployment logs and database configuration.");
  }
  process.exitCode = 1;
});
