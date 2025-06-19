"use node";

import { experimental_createMCPClient } from "ai";
import { Experimental_StdioMCPTransport } from "ai/mcp-stdio";
import type { Doc } from "../../_generated/dataModel";

// MCP client cache to avoid recreating clients
const mcpClientCache = new Map<string, any>();

// Function to create MCP client based on server configuration
export async function createMCPClient(server: Doc<"mcpServers">) {
  const cacheKey = `${server._id}_${server.transportType}_${server.url || server.command}`;

  // Return cached client if available
  if (mcpClientCache.has(cacheKey)) {
    return mcpClientCache.get(cacheKey);
  }

  let client;

  try {
    switch (server.transportType) {
      case "stdio": {
        if (!server.command) {
          throw new Error("Command is required for stdio transport");
        }
        const transport = new Experimental_StdioMCPTransport({
          command: server.command,
          args: server.args || [],
        });
        client = await experimental_createMCPClient({ transport });
        break;
      }

      case "sse": {
        if (!server.url) {
          throw new Error("URL is required for SSE transport");
        }
        client = await experimental_createMCPClient({
          transport: {
            type: "sse",
            url: server.url,
            headers: server.headers || {},
          },
        });
        break;
      }

      case "http": {
        if (!server.url) {
          throw new Error("URL is required for HTTP transport");
        }
        // Note: For custom HTTP transport, you might need to implement a custom transport
        // This is a placeholder - you may need to use StreamableHTTPClientTransport
        throw new Error("HTTP transport not yet implemented - use SSE instead");
      }

      default:
        throw new Error(
          `Unsupported transport type: ${String(server.transportType)}`
        );
    }

    // Cache the client
    mcpClientCache.set(cacheKey, client);

    return client;
  } catch (error) {
    console.error(`Failed to create MCP client for ${server.name}:`, error);
    throw error;
  }
}

// Function to get tools from an MCP server
export async function getMCPTools(server: Doc<"mcpServers">) {
  try {
    const client = await createMCPClient(server);
    const tools = await client.tools();

    // Return tools with server prefix to avoid naming conflicts
    const prefixedTools: Record<string, any> = {};
    Object.entries(tools).forEach(([toolName, tool]) => {
      const prefixedName = `mcp_${server.name.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${toolName}`;
      prefixedTools[prefixedName] = {
        ...(tool as any),
        description: `[${server.name}] ${(tool as any)?.description || toolName}`,
      };
    });

    return prefixedTools;
  } catch (error) {
    console.error(`Failed to get tools from MCP server ${server.name}:`, error);
    return {};
  }
}

// Function to create MCP tools for all enabled servers
export async function createMCPTools(servers: Doc<"mcpServers">[]) {
  const allMCPTools: Record<string, any> = {};

  // Process servers in parallel
  const toolPromises = servers
    .filter((server) => server.isEnabled)
    .map(async (server) => {
      try {
        const tools = await getMCPTools(server);
        return { server, tools };
      } catch (error) {
        console.error(
          `Failed to load tools from MCP server ${server.name}:`,
          error
        );
        return { server, tools: {} };
      }
    });

  const results = await Promise.all(toolPromises);

  // Merge all tools
  results.forEach(({ tools }) => {
    Object.assign(allMCPTools, tools);
  });

  return allMCPTools;
}

// Function to close MCP clients (call this when done)
export async function closeMCPClients() {
  const closePromises = Array.from(mcpClientCache.values()).map(
    async (client) => {
      try {
        await client.close();
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
