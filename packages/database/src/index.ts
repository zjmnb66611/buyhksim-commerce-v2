import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDatabase(url: string) {
  const client = postgres(url, { max: 20, idle_timeout: 20, connect_timeout: 10 });
  return { db: drizzle(client, { schema }), client };
}

export * from "./schema";
