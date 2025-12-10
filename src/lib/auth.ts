import { betterAuth } from "better-auth";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "$lib/server/db"; // your drizzle instance
import { getRequestEvent } from "$app/server";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID as string,
      clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
      disableSignUp: true,
    },
  },
  plugins: [sveltekitCookies(getRequestEvent)], // sveltekitCookies should be the last plugin in the array
});
