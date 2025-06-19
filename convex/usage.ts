import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { MODEL_INFO } from "../src/lib/models";

// Credit limits and maximum spending per plan
const PLAN_LIMITS = {
  free: {
    credits: 100,
    searches: 10,
    maxSpendingDollars: 1.0,
  },
  pro: {
    credits: 500,
    searches: 200,
    maxSpendingDollars: 8.0,
  },
  ultra: {
    credits: 2500,
    searches: 1000,
    maxSpendingDollars: 20.0,
  },
};

// Get token pricing for a model (per 1000 tokens in dollars)
function getModelPricing(model: string): { input: number; output: number } {
  const modelInfo = MODEL_INFO[model];

  if (modelInfo?.pricing) {
    // Convert from per 1M tokens to per 1000 tokens
    return {
      input: modelInfo.pricing.input / 1000,
      output: modelInfo.pricing.output / 1000,
    };
  }

  // Default fallback pricing for unknown models (per 1000 tokens)
  return { input: 0.001, output: 0.003 };
}

// Convert dollars to credits (1 credit = $0.01)
function dollarsToCredits(dollars: number): number {
  return Math.ceil(dollars * 100); // 1 credit = $0.01
}

// Import image models from centralized location
import { IMAGE_MODELS } from "../src/lib/models";

// Calculate cost in credits for image generation
function calculateImageCost(imageModel: string): number {
  const model = IMAGE_MODELS[imageModel];
  const pricing = model?.pricing || IMAGE_MODELS["fast-image-ai"].pricing;
  return dollarsToCredits(pricing);
}

// Calculate cost in credits based on token usage
function calculateTokenCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(model);

  const inputCost = (inputTokens / 1000) * pricing.input;
  const outputCost = (outputTokens / 1000) * pricing.output;
  const totalDollars = inputCost + outputCost;

  return dollarsToCredits(totalDollars);
}

async function ensureUsageRecord(ctx: any, userId: any) {
  let usage = await ctx.db
    .query("userUsage")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  if (!usage) {
    // Set reset date to exactly 1 month from now (30 days)
    const resetDate = new Date();
    resetDate.setTime(resetDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const planLimits = PLAN_LIMITS.free;
    const usageId = await ctx.db.insert("userUsage", {
      userId,
      plan: "free",
      creditsUsed: 0,
      creditsLimit: planLimits.credits,
      maxSpendingDollars: planLimits.maxSpendingDollars,
      dollarsSpent: 0,
      searchesUsed: 0,
      resetDate: resetDate.getTime(),
    });

    usage = await ctx.db.get(usageId);
  }

  // Check if we need to reset monthly usage (30 days from last reset)
  if (usage && Date.now() >= usage.resetDate) {
    // Set next reset to exactly 30 days from the current reset date
    const nextResetDate = new Date(usage.resetDate);
    nextResetDate.setTime(nextResetDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const planLimits = PLAN_LIMITS[usage.plan as keyof typeof PLAN_LIMITS];
    await ctx.db.patch(usage._id, {
      creditsUsed: 0,
      creditsLimit: planLimits.credits,
      maxSpendingDollars: planLimits.maxSpendingDollars,
      dollarsSpent: 0,
      searchesUsed: 0,
      resetDate: nextResetDate.getTime(),
    });

    usage = await ctx.db.get(usage._id);
  }

  return usage;
}

export const get = query({
  args: {},
  returns: v.object({
    _id: v.optional(v.id("userUsage")),
    _creationTime: v.number(),
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("ultra")),
    creditsUsed: v.number(),
    creditsLimit: v.number(),
    maxSpendingDollars: v.number(),
    dollarsSpent: v.number(),
    searchesUsed: v.number(),
    resetDate: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();

    // Return existing usage or default values
    if (usage) {
      return usage;
    }

    // Return default usage structure if none exists
    const planLimits = PLAN_LIMITS.free;
    return {
      _id: undefined,
      _creationTime: Date.now(),
      userId,
      plan: "free" as const,
      creditsUsed: 0,
      creditsLimit: planLimits.credits,
      maxSpendingDollars: planLimits.maxSpendingDollars,
      dollarsSpent: 0,
      searchesUsed: 0,
      resetDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
    };
  },
});

export const getLimits = query({
  args: {},
  returns: v.object({
    credits: v.number(),
    searches: v.number(),
    maxSpendingDollars: v.number(),
  }),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return PLAN_LIMITS.free;
    }

    const usage = await ctx.db
      .query("userUsage")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();

    const plan = usage?.plan || "free";
    return PLAN_LIMITS[plan];
  },
});

export const checkCreditsAvailable = query({
  args: {
    model: v.string(),
    estimatedInputTokens: v.number(),
    estimatedOutputTokens: v.number(),
  },
  returns: v.object({
    hasCredits: v.boolean(),
    requiredCredits: v.number(),
    availableCredits: v.number(),
    wouldExceedSpending: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get existing usage record without creating one (queries are read-only)
    const existingUsage = await ctx.db
      .query("userUsage")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();

    // Create a usage object with proper defaults
    let usage: {
      plan: "free" | "pro" | "ultra";
      creditsUsed: number;
      creditsLimit: number;
      maxSpendingDollars: number;
      dollarsSpent: number;
      resetDate: number;
    };

    if (!existingUsage) {
      // Use default free plan values if no usage record exists
      const planLimits = PLAN_LIMITS.free;
      usage = {
        plan: "free",
        creditsUsed: 0,
        creditsLimit: planLimits.credits,
        maxSpendingDollars: planLimits.maxSpendingDollars,
        dollarsSpent: 0,
        resetDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      };
    } else {
      // Check if we need to reset monthly usage (but don't actually reset in a query)
      if (Date.now() >= existingUsage.resetDate) {
        const planLimits = PLAN_LIMITS[existingUsage.plan];
        usage = {
          plan: existingUsage.plan,
          creditsUsed: 0,
          creditsLimit: planLimits.credits,
          maxSpendingDollars: planLimits.maxSpendingDollars,
          dollarsSpent: 0,
          resetDate: existingUsage.resetDate,
        };
      } else {
        usage = {
          plan: existingUsage.plan,
          creditsUsed: existingUsage.creditsUsed,
          creditsLimit: existingUsage.creditsLimit,
          maxSpendingDollars: existingUsage.maxSpendingDollars,
          dollarsSpent: existingUsage.dollarsSpent,
          resetDate: existingUsage.resetDate,
        };
      }
    }

    const requiredCredits = calculateTokenCost(
      args.model,
      args.estimatedInputTokens,
      args.estimatedOutputTokens
    );

    const availableCredits = usage.creditsLimit - usage.creditsUsed;
    const hasCredits = availableCredits >= requiredCredits;

    // Check if this would exceed spending limit
    const requiredDollars = requiredCredits / 100; // Convert credits back to dollars
    const wouldExceedSpending =
      usage.dollarsSpent + requiredDollars > usage.maxSpendingDollars;

    return {
      hasCredits,
      requiredCredits,
      availableCredits,
      wouldExceedSpending,
    };
  },
});

export const deductCredits = mutation({
  args: {
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
  },
  returns: v.object({
    creditsDeducted: v.number(),
    dollarsSpent: v.number(),
    remainingCredits: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const usage = await ensureUsageRecord(ctx, userId);
    if (!usage) {
      throw new Error("Failed to create usage record");
    }

    const creditsToDeduct = calculateTokenCost(
      args.model,
      args.inputTokens,
      args.outputTokens
    );

    const dollarsToSpend = creditsToDeduct / 100; // Convert credits to dollars

    // Check if user has enough credits
    const availableCredits = usage.creditsLimit - usage.creditsUsed;
    if (availableCredits < creditsToDeduct) {
      throw new Error(
        `Insufficient credits. Required: ${creditsToDeduct}, Available: ${availableCredits}`
      );
    }

    // Check spending limit
    if (usage.dollarsSpent + dollarsToSpend > usage.maxSpendingDollars) {
      throw new Error(
        `Would exceed monthly spending limit of $${usage.maxSpendingDollars}`
      );
    }

    const newCreditsUsed = usage.creditsUsed + creditsToDeduct;
    const newDollarsSpent = usage.dollarsSpent + dollarsToSpend;

    await ctx.db.patch(usage._id, {
      creditsUsed: newCreditsUsed,
      dollarsSpent: newDollarsSpent,
    });

    return {
      creditsDeducted: creditsToDeduct,
      dollarsSpent: dollarsToSpend,
      remainingCredits: usage.creditsLimit - newCreditsUsed,
    };
  },
});

export const incrementSearches = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const usage = await ensureUsageRecord(ctx, userId);
    if (!usage) {
      throw new Error("Failed to create usage record");
    }

    const limits = PLAN_LIMITS[usage.plan as keyof typeof PLAN_LIMITS];
    if (usage.searchesUsed >= limits.searches) {
      throw new Error(
        `Monthly search limit reached (${limits.searches}). Upgrade your plan for more searches.`
      );
    }

    await ctx.db.patch(usage._id, {
      searchesUsed: usage.searchesUsed + 1,
    });

    return null;
  },
});

export const checkImageCreditsAvailable = query({
  args: {
    imageModel: v.string(),
  },
  returns: v.object({
    hasCredits: v.boolean(),
    requiredCredits: v.number(),
    availableCredits: v.number(),
    wouldExceedSpending: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Get existing usage record without creating one (queries are read-only)
    const existingUsage = await ctx.db
      .query("userUsage")
      .withIndex("by_user", (q: any) => q.eq("userId", userId))
      .unique();

    // Create a usage object with proper defaults
    let usage: {
      plan: "free" | "pro" | "ultra";
      creditsUsed: number;
      creditsLimit: number;
      maxSpendingDollars: number;
      dollarsSpent: number;
      resetDate: number;
    };

    if (!existingUsage) {
      // Use default free plan values if no usage record exists
      const planLimits = PLAN_LIMITS.free;
      usage = {
        plan: "free",
        creditsUsed: 0,
        creditsLimit: planLimits.credits,
        maxSpendingDollars: planLimits.maxSpendingDollars,
        dollarsSpent: 0,
        resetDate: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days from now
      };
    } else {
      // Check if we need to reset monthly usage (but don't actually reset in a query)
      if (Date.now() >= existingUsage.resetDate) {
        const planLimits = PLAN_LIMITS[existingUsage.plan];
        usage = {
          plan: existingUsage.plan,
          creditsUsed: 0,
          creditsLimit: planLimits.credits,
          maxSpendingDollars: planLimits.maxSpendingDollars,
          dollarsSpent: 0,
          resetDate: existingUsage.resetDate,
        };
      } else {
        usage = {
          plan: existingUsage.plan,
          creditsUsed: existingUsage.creditsUsed,
          creditsLimit: existingUsage.creditsLimit,
          maxSpendingDollars: existingUsage.maxSpendingDollars,
          dollarsSpent: existingUsage.dollarsSpent,
          resetDate: existingUsage.resetDate,
        };
      }
    }

    const requiredCredits = calculateImageCost(args.imageModel);
    const availableCredits = usage.creditsLimit - usage.creditsUsed;
    const hasCredits = availableCredits >= requiredCredits;

    // Check if this would exceed spending limit
    const requiredDollars = requiredCredits / 100; // Convert credits back to dollars
    const wouldExceedSpending =
      usage.dollarsSpent + requiredDollars > usage.maxSpendingDollars;

    return {
      hasCredits,
      requiredCredits,
      availableCredits,
      wouldExceedSpending,
    };
  },
});

export const deductImageCredits = mutation({
  args: {
    imageModel: v.string(),
  },
  returns: v.object({
    creditsDeducted: v.number(),
    dollarsSpent: v.number(),
    remainingCredits: v.number(),
  }),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const usage = await ensureUsageRecord(ctx, userId);
    if (!usage) {
      throw new Error("Failed to create usage record");
    }

    const creditsToDeduct = calculateImageCost(args.imageModel);
    const dollarsToSpend = creditsToDeduct / 100; // Convert credits to dollars

    // Check if user has enough credits
    const availableCredits = usage.creditsLimit - usage.creditsUsed;
    if (availableCredits < creditsToDeduct) {
      throw new Error(
        `Insufficient credits. Required: ${creditsToDeduct}, Available: ${availableCredits}`
      );
    }

    // Check spending limit
    if (usage.dollarsSpent + dollarsToSpend > usage.maxSpendingDollars) {
      throw new Error(
        `Would exceed monthly spending limit of $${usage.maxSpendingDollars}`
      );
    }

    const newCreditsUsed = usage.creditsUsed + creditsToDeduct;
    const newDollarsSpent = usage.dollarsSpent + dollarsToSpend;

    await ctx.db.patch(usage._id, {
      creditsUsed: newCreditsUsed,
      dollarsSpent: newDollarsSpent,
    });

    return {
      creditsDeducted: creditsToDeduct,
      dollarsSpent: dollarsToSpend,
      remainingCredits: usage.creditsLimit - newCreditsUsed,
    };
  },
});

export const upgradePlan = mutation({
  args: {
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("ultra")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const usage = await ensureUsageRecord(ctx, userId);
    if (!usage) {
      throw new Error("Failed to create usage record");
    }

    const newPlanLimits = PLAN_LIMITS[args.plan];
    await ctx.db.patch(usage._id, {
      plan: args.plan,
      creditsLimit: newPlanLimits.credits,
      maxSpendingDollars: newPlanLimits.maxSpendingDollars,
    });

    return null;
  },
});

// Utility function to get token pricing info
export const getTokenPricing = query({
  args: {},
  returns: v.record(
    v.string(),
    v.object({
      input: v.number(),
      output: v.number(),
    })
  ),
  handler: async (_ctx) => {
    // Build pricing record from MODEL_INFO
    const pricing: Record<string, { input: number; output: number }> = {};

    for (const [modelId, modelInfo] of Object.entries(MODEL_INFO)) {
      if (modelInfo.pricing) {
        pricing[modelId] = {
          input: modelInfo.pricing.input / 1000,
          output: modelInfo.pricing.output / 1000,
        };
      }
    }

    return pricing;
  },
});
