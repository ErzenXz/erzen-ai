import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { Email } from "@convex-dev/auth/providers/Email";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password,
    Email({
      sendVerificationRequest: async ({ identifier: email, url, request }) => {
        // For development, we'll log the verification URL
        // In production, you would call your email service here
        // await ctx.runAction(internal.email.sendVerificationEmail, {
        //   email,
        //   verificationUrl: url,
        // });
      },
    }),
    GitHub,
    Google,
  ],
});

export const loggedInUser = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id("users"),
      _creationTime: v.number(),
      name: v.optional(v.string()),
      email: v.optional(v.string()),
      image: v.optional(v.string()),
      emailVerificationTime: v.optional(v.number()),
      isAnonymous: v.optional(v.boolean()),
    })
  ),
  handler: async (ctx: any) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
