"use node";

import { tool } from "ai";
import { z } from "zod";

export function createDateTimeTool() {
  return tool({
    description:
      "Get current date/time information or perform date calculations. Use ONLY when you need the current date/time, need to calculate time differences, or work with specific dates/times. Do NOT use for general time-related questions you can answer directly (like 'what day comes after Monday' or timezone explanations).",
    parameters: z.object({
      action: z
        .enum([
          "current_datetime",
          "current_date",
          "current_time",
          "timezone_convert",
          "date_add",
          "date_subtract",
          "date_diff",
          "format_date",
        ])
        .describe("The specific datetime operation needed"),
      timezone: z
        .string()
        .optional()
        .describe(
          "Specific timezone (e.g., 'America/New_York', 'Europe/London')"
        ),
      format: z
        .enum(["full", "date", "time"])
        .optional()
        .describe("Format type - full, date only, or time only"),
    }),
    execute: async ({ timezone, format = "full" }): Promise<string> => {
      try {
        const now = new Date();
        let dateTime;

        if (timezone) {
          dateTime = new Intl.DateTimeFormat("en-US", {
            timeZone: timezone,
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
            weekday: "long",
          }).format(now);
        } else {
          dateTime = now.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
            weekday: "long",
          });
        }

        if (format === "date") {
          return `Current date: ${now.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
            ...(timezone && { timeZone: timezone }),
          })}`;
        } else if (format === "time") {
          return `Current time: ${now.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            timeZoneName: "short",
            ...(timezone && { timeZone: timezone }),
          })}`;
        }

        return `Current date and time: ${dateTime}`;
      } catch (error) {
        return `Error getting date/time: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
}
