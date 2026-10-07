import "dotenv/config";

const email = String(process.env.SUPER_ADMIN_EMAIL || "").trim().toLowerCase();
const password = String(process.env.SUPER_ADMIN_PASSWORD || "");
const name = String(process.env.SUPER_ADMIN_NAME || "").trim();
const allowUpdate = String(process.env.SUPER_ADMIN_ALLOW_UPDATE || "").toLowerCase() === "true";

// Reduce the chance of accidental downstream logging after reading the secret.
delete process.env.SUPER_ADMIN_PASSWORD;

function validateInputs() {
  if (!email) throw new Error("SUPER_ADMIN_EMAIL is required.");
  if (!password) throw new Error("SUPER_ADMIN_PASSWORD is required.");
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SUPER_ADMIN_EMAIL must be a valid email address.");
  }
  if (name.length > 120) throw new Error("SUPER_ADMIN_NAME must be 120 characters or fewer.");
  if (password.length < 14 || password.length > 128) {
    throw new Error("SUPER_ADMIN_PASSWORD must be between 14 and 128 characters.");
  }
  if (
    !/[a-z]/.test(password)
    || !/[A-Z]/.test(password)
    || !/[0-9]/.test(password)
    || !/[^A-Za-z0-9]/.test(password)
  ) {
    throw new Error(
      "SUPER_ADMIN_PASSWORD must include lowercase, uppercase, number, and symbol characters.",
    );
  }
}

async function main() {
  validateInputs();
  const [{ hashPassword }, { provisionSuperAdmin }] = await Promise.all([
    import("../src/auth/passwords.js"),
    import("../src/data/store.js"),
  ]);
  const passwordHash = await hashPassword(password);
  const result = await provisionSuperAdmin({
    email,
    name,
    passwordHash,
    allowUpdate,
  });
  console.log(result.created
    ? "Super Admin created successfully."
    : "Super Admin updated successfully.");
}

main().catch((error) => {
  if (error?.compensationFailed) {
    console.error(
      "Super Admin provisioning failed and automatic rollback could not be verified. Inspect users.role and company_memberships before retrying.",
    );
  } else if (error?.safeForCli || error?.message?.startsWith("SUPER_ADMIN_")) {
    console.error(`Super Admin provisioning failed: ${error.message}`);
  } else if (error instanceof Error && error.message && !error.message.includes(password)) {
    const isValidationError = error.message.startsWith("SUPER_ADMIN_");
    console.error(isValidationError
      ? `Super Admin provisioning failed: ${error.message}`
      : "Super Admin provisioning failed. Review backend storage configuration.");
  } else {
    console.error("Super Admin provisioning failed. Review backend storage configuration.");
  }
  process.exitCode = 1;
});
