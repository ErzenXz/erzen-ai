/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai_core_index from "../ai/core/index.js";
import type * as ai_core_nonStreaming from "../ai/core/nonStreaming.js";
import type * as ai_core_streaming from "../ai/core/streaming.js";
import type * as ai_core_utils from "../ai/core/utils.js";
import type * as ai_index from "../ai/index.js";
import type * as ai_providers_constants from "../ai/providers/constants.js";
import type * as ai_providers_index from "../ai/providers/index.js";
import type * as ai_tools_calculator from "../ai/tools/calculator.js";
import type * as ai_tools_codeAnalysis from "../ai/tools/codeAnalysis.js";
import type * as ai_tools_datetime from "../ai/tools/datetime.js";
import type * as ai_tools_imageGeneration from "../ai/tools/imageGeneration.js";
import type * as ai_tools_index from "../ai/tools/index.js";
import type * as ai_tools_mcp from "../ai/tools/mcp.js";
import type * as ai_tools_memory from "../ai/tools/memory.js";
import type * as ai_tools_thinking from "../ai/tools/thinking.js";
import type * as ai_tools_urlFetch from "../ai/tools/urlFetch.js";
import type * as ai_tools_weather from "../ai/tools/weather.js";
import type * as ai_tools_webSearch from "../ai/tools/webSearch.js";
import type * as ai_utils_browse from "../ai/utils/browse.js";
import type * as ai_utils_errors from "../ai/utils/errors.js";
import type * as ai_utils_imageProviders from "../ai/utils/imageProviders.js";
import type * as ai_utils_search from "../ai/utils/search.js";
import type * as ai_utils_weather from "../ai/utils/weather.js";
import type * as ai from "../ai.js";
import type * as apiKeys from "../apiKeys.js";
import type * as auth from "../auth.js";
import type * as branches from "../branches.js";
import type * as conversations from "../conversations.js";
import type * as email from "../email.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as mcpServers from "../mcpServers.js";
import type * as messages from "../messages.js";
import type * as preferences from "../preferences.js";
import type * as router from "../router.js";
import type * as usage from "../usage.js";
import type * as userAccount from "../userAccount.js";
import type * as userInstructions from "../userInstructions.js";
import type * as userMemories from "../userMemories.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "ai/core/index": typeof ai_core_index;
  "ai/core/nonStreaming": typeof ai_core_nonStreaming;
  "ai/core/streaming": typeof ai_core_streaming;
  "ai/core/utils": typeof ai_core_utils;
  "ai/index": typeof ai_index;
  "ai/providers/constants": typeof ai_providers_constants;
  "ai/providers/index": typeof ai_providers_index;
  "ai/tools/calculator": typeof ai_tools_calculator;
  "ai/tools/codeAnalysis": typeof ai_tools_codeAnalysis;
  "ai/tools/datetime": typeof ai_tools_datetime;
  "ai/tools/imageGeneration": typeof ai_tools_imageGeneration;
  "ai/tools/index": typeof ai_tools_index;
  "ai/tools/mcp": typeof ai_tools_mcp;
  "ai/tools/memory": typeof ai_tools_memory;
  "ai/tools/thinking": typeof ai_tools_thinking;
  "ai/tools/urlFetch": typeof ai_tools_urlFetch;
  "ai/tools/weather": typeof ai_tools_weather;
  "ai/tools/webSearch": typeof ai_tools_webSearch;
  "ai/utils/browse": typeof ai_utils_browse;
  "ai/utils/errors": typeof ai_utils_errors;
  "ai/utils/imageProviders": typeof ai_utils_imageProviders;
  "ai/utils/search": typeof ai_utils_search;
  "ai/utils/weather": typeof ai_utils_weather;
  ai: typeof ai;
  apiKeys: typeof apiKeys;
  auth: typeof auth;
  branches: typeof branches;
  conversations: typeof conversations;
  email: typeof email;
  files: typeof files;
  http: typeof http;
  mcpServers: typeof mcpServers;
  messages: typeof messages;
  preferences: typeof preferences;
  router: typeof router;
  usage: typeof usage;
  userAccount: typeof userAccount;
  userInstructions: typeof userInstructions;
  userMemories: typeof userMemories;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
