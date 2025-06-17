import { tool } from "ai";
import { z } from "zod";
import { getWeatherData } from "../utils/weather";

export function createWeatherTool(ctx: any) {
  return tool({
    description:
      "Get current weather conditions and forecasts for specific locations. Use ONLY when users specifically ask for current weather information or forecasts. Do NOT use for general weather-related questions, explanations about weather phenomena, or climate discussions you can answer directly.",
    parameters: z.object({
      location: z
        .string()
        .describe(
          "The specific city, region, or location to get current weather information for"
        ),
      type: z
        .enum(["current", "forecast"])
        .optional()
        .describe(
          "Whether to get current weather or forecast (defaults to current)"
        ),
    }),
    execute: async ({ location, type = "current" }): Promise<string> => {
      try {
        return await getWeatherData(ctx, location);
      } catch (error) {
        return `Unable to get weather information for ${location}. Please try a more specific location name.`;
      }
    },
  });
}
