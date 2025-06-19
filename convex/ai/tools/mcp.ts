"use node";

import { experimental_createMCPClient } from "ai";
import type { Doc } from "../../_generated/dataModel";

// MCP client cache to avoid recreating clients
const mcpClientCache = new Map<string, any>();

// Function to create MCP client based on server configuration
export async function createMCPClient(server: Doc<"mcpServers">) {
  const cacheKey = `${server._id}_${server.transportType}_${server.url ?? server.command}`;

  // Return cached client if available
  if (mcpClientCache.has(cacheKey)) {
    return mcpClientCache.get(cacheKey);
  }

  let client;

  try {
    switch (server.transportType) {
      case "stdio": {
        // SECURITY: stdio transport disabled - it allows arbitrary command execution on server
        throw new Error(
          "stdio transport is coming soon, use sse, or http transport instead."
        );
      }

      case "sse": {
        if (!server.url) {
          throw new Error("URL is required for SSE transport");
        }

        // Special handling for GitHub MCP server
        const finalUrl = server.url;
        const finalHeaders = { ...server.headers };

        client = await experimental_createMCPClient({
          transport: {
            type: "sse",
            url: finalUrl,
            headers: finalHeaders,
          },
        });
        break;
      }

      case "http": {
        if (!server.url) {
          throw new Error("URL is required for HTTP transport");
        }

        try {
          const { StreamableHTTPClientTransport } = await import(
            "@modelcontextprotocol/sdk/client/streamableHttp.js"
          );

          const finalUrl = server.url;
          const finalHeaders = { ...server.headers };

          // Create transport with proper configuration based on Context7 docs
          const transport = new StreamableHTTPClientTransport(
            new URL(finalUrl),
            {
              requestInit: {
                headers: finalHeaders,
              },
            }
          );

          client = await experimental_createMCPClient({ transport });
        } catch (importError) {
          console.error(
            `Failed to create HTTP MCP client for ${server.name}:`,
            importError
          );

          // Log more details about the error
          if (importError instanceof Error) {
            console.error(`Error name: ${importError.name}`);
            console.error(`Error message: ${importError.message}`);
            console.error(`Error stack: ${importError.stack}`);
          }

          throw new Error(
            `Failed to create HTTP MCP client: ${importError instanceof Error ? importError.message : String(importError)}`
          );
        }
        break;
      }

      default:
        throw new Error(
          `Unsupported transport type: ${String(server.transportType)}`
        );
    }

    mcpClientCache.set(cacheKey, client);

    return client;
  } catch (error) {
    console.error(`Failed to create MCP client for ${server.name}:`, error);
    // Provide more detailed error information
    if (error instanceof Error) {
      throw new Error(
        `MCP client creation failed for ${server.name}: ${error.message}`
      );
    }
    throw error;
  }
}

// Function to get tools from an MCP server
export async function getMCPTools(server: Doc<"mcpServers">) {
  try {
    const client = await createMCPClient(server);

    // Add timeout for tools() call
    const toolsPromise = client.tools();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Tools fetch timeout")), 15000); // 15s timeout
    });

    const tools = await Promise.race([toolsPromise, timeoutPromise]);

    // Return tools with server prefix to avoid naming conflicts
    const prefixedTools: Record<string, any> = {};
    Object.entries(tools).forEach(([toolName, tool]) => {
      const prefixedName = `mcp_${server.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${toolName}`;
      prefixedTools[prefixedName] = {
        ...(tool as any),
        description: `[${server.name}] ${(tool as any)?.description ?? toolName}`,
      };
    });

    return prefixedTools;
  } catch (error) {
    console.error(`Failed to get tools from MCP server ${server.name}:`, error);
    // Return empty object instead of throwing to prevent cascade failures
    return {};
  }
}

// Function to create MCP tools for all enabled servers
export async function createMCPTools(servers: Doc<"mcpServers">[]) {
  const allMCPTools: Record<string, any> = {};

  // Process servers in parallel with individual error handling
  const toolPromises = servers
    .filter((server) => server.isEnabled)
    .map(async (server) => {
      try {
        const tools = await getMCPTools(server);
        return { server, tools, success: true };
      } catch (error) {
        console.error(
          `Failed to load tools from MCP server ${server.name}:`,
          error
        );
        return { server, tools: {}, success: false };
      }
    });

  const results = await Promise.all(toolPromises);

  // Merge all tools and report results
  const successfulServers: string[] = [];
  const failedServers: string[] = [];

  results.forEach(({ server, tools, success }) => {
    Object.assign(allMCPTools, tools);
    if (success && Object.keys(tools).length > 0) {
      successfulServers.push(server.name);
    } else {
      failedServers.push(server.name);
    }
  });

  return allMCPTools;
}

// Function to close MCP clients (call this when done)
export async function closeMCPClients() {
  const closePromises = Array.from(mcpClientCache.values()).map(
    async (client) => {
      try {
        if (client && typeof client.close === "function") {
          await client.close();
        }
      } catch (error) {
        console.error("Error closing MCP client:", error);
      }
    }
  );

  await Promise.all(closePromises);
  mcpClientCache.clear();
}

// Function to get tool info for UI without creating full tools
export function getMCPToolInfo(servers: Doc<"mcpServers">[]) {
  return servers
    .filter((server) => server.isEnabled)
    .map((server) => ({
      id: `mcp_${server.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      name: `MCP: ${server.name}`,
      description: server.description || `Tools from ${server.name} MCP server`,
      category: "mcp",
      mcpServerId: server._id,
      transportType: server.transportType,
      url: server.url,
      command: server.command,
      availableTools: server.availableTools || [],
    }));
}
