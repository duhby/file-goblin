import { betterAuth } from "better-auth";
import { sveltekitCookies } from "better-auth/svelte-kit";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "$lib/server/db"; // your drizzle instance
import { getRequestEvent } from "$app/server";
import { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } from "$env/static/private";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg", // or "mysql", "sqlite"
  }),
  socialProviders: {
    github: {
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      disableSignUp: true,
    },
  },
  plugins: [sveltekitCookies(getRequestEvent)], // sveltekitCookies should be the last plugin in the array
});
