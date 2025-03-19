import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import dotenv from "dotenv";
import express from "express";
import fs from "fs-extra";
import path from "path";
import { z } from "zod";
import OnePanelAPI from "./1panel-api.mjs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const mcpServer = new McpServer(
  {
    name: "1panel-deploy",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: ["deploy_website"],
    },
  }
);

mcpServer.tool(
  "deploy_website",
  "Deploy website to 1Panel server",
  {
    domain: z.string().describe("Website domain"),
    buildDir: z
      .string()
      .optional()
      .describe(
        "Build directory name (e.g. /Users/username/project/dist, /Users/username/project/build)"
      ),
  },
  async (params) => {
    try {
      const { buildDir, domain } = params;

      const buildDirPath = path.resolve(buildDir);
      if (!fs.existsSync(buildDirPath)) {
        return {
          content: [
            {
              type: "text",
              text: `Build directory ${buildDir} does not exist`,
            },
          ],
          isError: true,
        };
      }

      const deployResult = await deployTo1Panel(buildDirPath, domain);

      return {
        content: [
          {
            type: "text",
            text: `
Successfully deployed to 1Panel!
Domain: ${deployResult.domain}
URL: ${deployResult.url}
Upload statistics:
- Total files: ${deployResult.uploadStats.totalFiles}
- Successfully uploaded: ${deployResult.uploadStats.successCount}
- Failed to upload: ${deployResult.uploadStats.failCount}
          `,
          },
        ],
      };
    } catch (error) {
      console.error("Deployment failed:", error);
      return {
        content: [
          {
            type: "text",
            text: `Deployment failed: ${
              error.message || "An internal error occurred during deployment"
            }`,
          },
        ],
        isError: true,
      };
    }
  }
);

let activeTransport = null;

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  activeTransport = transport;

  await mcpServer.connect(transport);

  req.on("close", () => {
    console.log("Client disconnected");
    if (activeTransport === transport) {
      activeTransport = null;
    }
  });
});

app.post("/messages", async (req, res) => {
  try {
    if (activeTransport) {
      await activeTransport.handlePostMessage(req, res);
    } else {
      res.status(400).json({ error: "No active transport connection" });
    }
  } catch (error) {
    console.error("Error processing message:", error);
    res.status(500).json({ error: "Failed to process message" });
  }
});

app.listen(PORT, () => {
  console.log(`MCP server running on port ${PORT}`);
  console.log(`MCP SSE endpoint: http://localhost:${PORT}/sse`);
  console.log(`MCP message endpoint: http://localhost:${PORT}/messages`);
});

async function deployTo1Panel(buildDirPath, domain = "") {
  try {
    console.log(`Start deploying directory ${buildDirPath} to 1Panel`);

    const onePanelAPI = new OnePanelAPI({
      baseURL: process.env.ONEPANEL_BASE_URL,
      apiKey: process.env.ONEPANEL_API_KEY,
      languageCode: process.env.ONEPANEL_LANGUAGE || "zh",
    });

    const siteConfig = {
      domain: domain,
    };

    let website = await onePanelAPI.getWebsiteDetail(domain);

    if (!website) {
      website = await onePanelAPI.createWebsite(siteConfig);
      console.log(`Create website: domain: ${domain}`);
    } else {
      console.log(`Website already exists: domain: ${domain}`);
    }

    console.log("Upload files to website");

    const uploadResult = await onePanelAPI.uploadStaticFiles(
      domain,
      buildDirPath
    );

    return {
      domain: domain,
      url: `http://${domain}`,
      status: "success",
      uploadStats: {
        totalFiles: uploadResult.totalFiles,
        successCount: uploadResult.successCount,
        failCount: uploadResult.failCount,
      },
    };
  } catch (error) {
    console.error("Error deploying to 1Panel:", error);
    throw new Error(`1Panel deployment failed: ${error.message}`);
  }
}
