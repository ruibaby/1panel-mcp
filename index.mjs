#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { deployWebsite } from "./operations/deploy-website.js";

import { z } from "zod";

const server = new Server(
  {
    name: "1panel-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "deploy_website",
        description: "Deploy website to 1Panel server",
        inputSchema: zodToJsonSchema(
          z.object({
            domain: z.string().describe("Website domain"),
            buildDir: z
              .string()
              .describe(
                "Build directory name (e.g. /Users/username/project/dist, /Users/username/project/build)"
              ),
          })
        ),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    switch (request.params.name) {
      case "deploy_website": {
        const args = request.params.arguments;
        const deployResult = await deployWebsite(args.buildDir, args.domain);
        return deployResult;
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("1Panel MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
