// Helper function to get user-friendly error messages
export function getUserFriendlyErrorMessage(
  error: unknown,
  provider: string,
  usingUserKey: boolean
): string {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  const errorString = String(error);

  // Handle timeout errors specifically for different providers
  if (errorMessage.includes("timeout") || errorString.includes("timeout")) {
    if (provider === "google") {
      return `Google Gemini model timed out after 10 minutes. This can happen with complex requests, especially with Gemini 2.5 Pro. Try simplifying your request, using a different Gemini model (like Gemini 1.5 Pro), or retry the request.`;
    }
    return `Connection timeout with ${provider}. The service may be temporarily unavailable or the request is taking too long. Please try again in a moment.`;
  }

  // Handle abort/cancellation errors
  if (errorMessage.includes("aborted") || errorMessage.includes("cancelled")) {
    return `Request was cancelled or aborted. This can happen due to timeouts or user cancellation.`;
  }

  // Common error patterns and their user-friendly explanations
  if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
    return `Authentication failed with ${provider}. ${usingUserKey ? "Please check your API key in settings." : "The built-in API key may be invalid. Try adding your own API key in settings."}`;
  }

  if (errorMessage.includes("403") || errorMessage.includes("Forbidden")) {
    return `Access denied by ${provider}. ${usingUserKey ? "Your API key may not have the required permissions." : "The built-in API key may have insufficient permissions. Try adding your own API key in settings."}`;
  }

  if (errorMessage.includes("429") || errorMessage.includes("rate limit")) {
    return `Rate limit exceeded for ${provider}. ${usingUserKey ? "Please wait a moment before trying again." : "The built-in API key has hit rate limits. Try adding your own API key in settings for unlimited usage."}`;
  }

  if (errorMessage.includes("quota") || errorMessage.includes("billing")) {
    return `Quota or billing issue with ${provider}. ${usingUserKey ? "Please check your account billing and quota limits." : "The built-in API key may have reached its quota. Try adding your own API key in settings."}`;
  }

  if (
    errorMessage.includes("ECONNRESET") ||
    errorMessage.includes("network") ||
    errorMessage.includes("connection")
  ) {
    return `Network connection issue with ${provider}. The service may be temporarily unavailable. Please try again in a moment.`;
  }

  if (errorMessage.includes("model") && errorMessage.includes("not found")) {
    return `The requested model is not available on ${provider}. Please try a different model or provider.`;
  }

  // Provider-specific error handling
  if (provider === "google") {
    if (errorMessage.includes("SAFETY") || errorMessage.includes("safety")) {
      return `Google Gemini blocked the request due to safety filters. Try rephrasing your request or using a different model.`;
    }
    if (
      errorMessage.includes("RECITATION") ||
      errorMessage.includes("recitation")
    ) {
      return `Google Gemini blocked the request due to potential copyright concerns. Try rephrasing your request.`;
    }
    if (errorMessage.includes("BLOCKED_REASON")) {
      return `Google Gemini blocked the request. This could be due to safety filters, content policies, or other restrictions. Try rephrasing your request.`;
    }
  }

  if (provider === "anthropic") {
    if (
      errorMessage.includes("content_filter") ||
      errorMessage.includes("content filter")
    ) {
      return `Anthropic Claude blocked the request due to content policy violations. Try rephrasing your request.`;
    }
  }

  if (provider === "openai") {
    if (
      errorMessage.includes("content_policy") ||
      errorMessage.includes("content policy")
    ) {
      return `OpenAI blocked the request due to content policy violations. Try rephrasing your request.`;
    }
    if (errorMessage.includes("moderation")) {
      return `OpenAI moderation system flagged your request. Try rephrasing to avoid potentially harmful content.`;
    }
  }

  // Handle empty or no content generated errors
  if (
    errorMessage.includes("No content generated") ||
    errorMessage.includes("empty response")
  ) {
    return `${provider} didn't generate any content. This can happen if the request was blocked by safety filters or if there was an internal issue. Try rephrasing your request or using a different model.`;
  }

  // Return the original error message with some context
  return `Error from ${provider}: ${errorMessage}${!usingUserKey ? " Consider adding your own API keys in settings for better reliability." : ""}`;
}
