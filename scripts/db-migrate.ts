// Apply db/migrations to DATABASE_URL. Neon URLs go over Neon's HTTP driver;
// any other Postgres URL (local development) uses node-postgres.
import { isNeonUrl, neonDb } from "../src/lib/server/db";
import { runMigrations } from "../src/lib/server/migrate";
import { pgDb } from "../src/lib/server/pgDb";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL first (Neon connection string).");
  process.exit(1);
}
const db = isNeonUrl(url) ? neonDb(url) : pgDb(url);
runMigrations(db)
  .then((ran) => console.log(ran.length ? `Applied: ${ran.join(", ")}` : "Database is up to date."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => ("end" in db ? (db as { end: () => Promise<void> }).end() : undefined));
