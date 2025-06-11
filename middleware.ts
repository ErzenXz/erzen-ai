import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  // Exclude Clerk public routes (sign-in, sign-up, etc.) and static files
  matcher: [
    // Everything EXCEPT:
    //  - files with an extension (e.g. .png, .css)
    //  - Next.js internal paths (_next)
    //  - auth pages handled by Clerk (sign-in, sign-up, sso-callback)
    //  - public /favicon.ico or similar can still be accessed
    // Then include api and trpc routes separately
    "/((?!.+\\.[\\w]+$|_next|sign-in|sign-up|sso-callback).*)",
    "/(api|trpc)(.*)",
  ],
};
