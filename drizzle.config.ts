import { defineConfig } from "drizzle-kit";

if (!process.env.NETLIFY_DATABASE_URL_UNPOOLED)
  throw new Error("NETLIFY_DATABASE_URL_UNPOOLED is not set");

export default defineConfig({
  schema: "./src/lib/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.NETLIFY_DATABASE_URL_UNPOOLED },
  verbose: true,
  strict: true,
});
