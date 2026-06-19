# Quick Setup Guide

This guide will help you get the Bar Assistant MCP Server running in under 5 minutes using Docker.

## Prerequisites

- Docker and Docker Compose
- Access to a Bar Assistant instance
- A generated Bar Assistant API token

## Step 1: Clone the Repository

```bash
git clone <your-repository-url>
cd bar-assistant-mcp-server
```

## Step 2: Configure Environment

1.  **Create `.env` file:**
    ```bash
    cp .env.example .env
    ```

2.  **Edit `.env`:**
    - `BAR_ASSISTANT_URL`: Your instance URL (e.g., `https://your-bar.com/bar`)
    - `BAR_ASSISTANT_TOKEN`: Your API token.
    - `BAR_ASSISTANT_BAR_ID`: The ID of the bar to query (usually `1`).

    **Important:** If your token has special characters, wrap it in single quotes: `BAR_ASSISTANT_TOKEN='your|token'`.

## Step 3: Build and Run

```bash
docker-compose up --build -d
```

The server will be available at `http://localhost:3001`.

## PourOver Gateway Setup

For users of the PourOver mobile application:
1. Configure your mobile app to point to `http://<your-server-ip>:3001/query`.
2. Set the API Key in the PourOver settings to the exact value configured for `MCP_SSE_TOKEN` in your `.env` file.

## Troubleshooting

- **Authentication Errors:**
  - Verify your `BAR_ASSISTANT_TOKEN` is correct.
  - Ensure the `BAR_ASSISTANT_URL` is the correct API endpoint.
  - For PourOver gateway connections, ensure `x-api-key` matches the configured `MCP_SSE_TOKEN`.
- **Connection Refused:**
  - Check that the Docker container is running (`docker-compose ps`).
  - Ensure port `3001` is not blocked by a firewall.

---

🎉 You're all set! Interact with the server using your favorite MCP client or PourOver mobile application.
