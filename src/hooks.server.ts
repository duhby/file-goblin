import { auth } from "$lib/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { redirect, type Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  // Fetch current session from Better Auth
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  // Make session and user available on server via event.locals
  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  }

  // // Define public routes that don't require authentication
  // const publicRoutes = ["/login", "/signup", "/forgot-password"];
  // const isPublicRoute = publicRoutes.some((route) => event.url.pathname.startsWith(route));
  //
  // // Redirect to login if not authenticated and trying to access protected route
  // if (!session && !isPublicRoute && !building) {
  //   throw redirect(303, "/login");
  // }
  //
  // // Redirect to home if authenticated and trying to access login page
  // if (session && event.url.pathname === "/login") {
  //   throw redirect(303, "/");
  // }

  return svelteKitHandler({ event, resolve, auth, building });
};
