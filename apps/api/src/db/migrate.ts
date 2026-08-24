import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { createDb } from "./client.js";

const db = createDb();
migrate(db, { migrationsFolder: new URL("../../drizzle", import.meta.url).pathname });
console.log("Migrations applied");
