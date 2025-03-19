# 1Panel MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for automated website deployment to 1Panel.

> [!IMPORTANT]
> Currently, this project is an experimental project and does not mean that it can be used directly.

## Features

- Automates website deployment to 1Panel servers
- Creates websites if they don't already exist
- Uploads static website files to 1Panel
- Fully compatible with the MCP standard protocol

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/1panel-mcp-server.git
cd 1panel-mcp-server

# Install dependencies
npm install
# Or if you use pnpm
pnpm install

# Configure environment variables
cp .env.example .env
```

Edit the `.env` file with your 1Panel server information:

```bash
PORT=3000
ONEPANEL_BASE_URL=http://your-1panel-ip:port/api/v1
ONEPANEL_API_KEY=your_api_key
ONEPANEL_LANGUAGE=zh  # Language options: zh (Chinese) or en (English)
```

## Usage

### Start the server

```bash
# Start the server
npm start

# For development with auto-reload
npm run dev
```

### Configure MCP in Cursor IDE

To use this server with Cursor IDE, add the following MCP configuration:

1. Open Cursor
2. Create `.cursor/mcp.json`

```json
{
  "mcpServers": {
    "Deploy to 1Panel": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

### Use MCP to Deploy Websites

In Cursor, you can deploy websites using the following command in the AI chat:

```plaintext
Deploy to 1Panel with domain=yourdomain.com
```

Or you can use the following format:

```plaintext
Deploy website to 1Panel server, domain: yourdomain.com
```

## API Reference

### MCP Tool: deploy_website

Deploys a website to 1Panel.

**Parameters:**

- `domain` (required): Website domain
- `buildDir` (optional): Build directory path

**Response:**

```plaintext
Successfully deployed to 1Panel!
Domain: yourdomain.com
URL: http://yourdomain.com
Upload statistics:
- Total files: 25
- Successfully uploaded: 25
- Failed to upload: 0
```

## Implementation Details

### Deployment Process

1. **Check Build Directory**: Verifies if the specified build directory exists
2. **Website Creation**: Creates a new static website through 1Panel API if it doesn't exist
3. **File Upload**: Uploads all files from the build directory to the website
4. **Statistics**: Returns detailed statistics about the upload process

## Troubleshooting

If you encounter deployment issues, check the following:

1. Ensure your API Key is valid and has sufficient permissions
2. Verify that the website directory exists and has write permissions
3. Check the 1Panel server logs for more detailed error information
4. If file uploads fail, it may be due to file permission or format issues
