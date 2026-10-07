import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isSupabaseConfigured, saveStoreToSupabase } from "../src/data/supabaseStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
const projectDir = path.resolve(backendDir, "..");

dotenv.config({ path: path.join(projectDir, ".env") });
dotenv.config({ path: path.join(backendDir, ".env") });

const inputPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(backendDir, "src/data-store/store.json");
const pruneMissing = process.argv.includes("--prune");

if (!isSupabaseConfigured()) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (!fs.existsSync(inputPath)) {
  console.error(`Store file not found: ${inputPath}`);
  process.exit(1);
}

const store = JSON.parse(fs.readFileSync(inputPath, "utf8"));
await saveStoreToSupabase(store, { pruneMissing });

console.log(`Migrated ${inputPath} to Supabase.`);
console.log(`Mode: ${pruneMissing ? "replace/prune missing rows" : "merge only, no remote deletes"}`);
console.log(`Users: ${store.users?.length || 0}`);
console.log(`Products: ${store.products?.length || 0}`);
console.log(`Orders: ${store.orders?.length || 0}`);
