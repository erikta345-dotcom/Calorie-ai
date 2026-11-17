import { createClient } from "@libsql/client";

type DatabaseClient = ReturnType<typeof createClient>;

let client: DatabaseClient | undefined;

function getClient(): DatabaseClient {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL must be configured before using the database.");
    }

    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  return client;
}

// API route modules are imported while Next.js collects build-time page data.
// Defer client creation until a handler actually performs database work.
export const db = new Proxy({} as DatabaseClient, {
  get(_target, property) {
    const database = getClient();
    const value = Reflect.get(database, property, database);
    return typeof value === "function" ? value.bind(database) : value;
  },
});
