import { auth } from "$lib/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { redirect, type Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  const publicRoutes = ["/login", "/api/auth"];
  const isPublicRoute = publicRoutes.some(
    (route) => event.url.pathname === route || event.url.pathname.startsWith(route + "/"),
  );

  if (!session && !isPublicRoute && !building) {
    redirect(303, "/login");
  }

  if (session && event.url.pathname === "/login") {
    redirect(303, "/app");
  }

  return svelteKitHandler({ event, resolve, auth, building });
};
