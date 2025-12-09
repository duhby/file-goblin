import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";
import { env } from "$env/dynamic/private";

if (!env.NETLIFY_DATABASE_URL_UNPOOLED) throw new Error("database url is not set");

const client = neon(env.NETLIFY_DATABASE_URL_UNPOOLED);

export const db = drizzle(client, { schema });
