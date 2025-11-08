# Bar Assistant MCP Server


A high-performance Model Context Protocol (MCP) server that provides intelligent cocktail search and recipe retrieval from [Bar Assistant](https://github.com/karlomikus/bar-assistant) instances.


## Features

A high-performance Model Context Protocol (MCP) server that provides intelligent cocktail search and recipe retrieval with advanced batch processing capabilities.A Model Context Protocol (MCP) server that integrates with Bar Assistant, enabling natural language interactions with your cocktail database through AI assistants like GitHub Copilot.



- 🔍 **Smart Cocktail Search** - Natural language queries with similarity matching

- 📖 **Complete Recipes** - Detailed ingredients, instructions, and specifications  

- 🎯 **Similarity Engine** - Discover cocktails similar to your favorites## 🚀 Features## Features

- 🧪 **Ingredient Analysis** - Find cocktails by ingredients, flavors, and characteristics

- ⚡ **Batch Processing** - Retrieve multiple recipes simultaneously (5-10x faster)

- 💾 **Smart Caching** - Intelligent caching with 70%+ hit rate

- 🔧 **Advanced Filtering** - ABV ranges, glassware, preparation methods, and more### **Intelligent Cocktail Discovery**- 🔍 **Search Cocktails** - Find drinks by name, ingredient, base spirit, or ABV



## Prerequisites

- Node.js 18 or higher- 🧪 **Ingredient Analysis**: Find cocktails by ingredients, flavors, and characteristics  - 🎯 **Smart Recommendations** - Find similar cocktails based on flavor profiles

- Access to a Bar Assistant instance

- Bar Assistant API token- 🎯 **Advanced Filtering**: ABV ranges, glassware, preparation methods, and more- 📦 **Inventory Management** - Check what you can make with available ingredients



## Installation

1. **Clone the repository:**

```bash
git clone https://github.com/zhdenny/bar-assistant-mcp-server
cd bar-assistant-mcp-server
npm install
npm run build
```

### Environment Variables

Set the following environment variables or configure them in your MCP client:

```bash

export BAR_ASSISTANT_URL="https://saltrim.domain.com/bar"

export BAR_ASSISTANT_TOKEN="token"

export BAR_ASSISTANT_BAR_ID="1"  # Set to the Bar Assistant Bar ID for the bar you want to query

```

### Claude Desktop Configuration

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```jsonc
{
  "mcpServers": {
    "bar-assistant": {
      "command": "node",
      "args": [
        "/root/path/to/bar-assistant-mcp-server/dist/src/bar-assistant-mcp-server.js"
      ],
      "env": {
        "BAR_ASSISTANT_URL": "https://saltrim.domain.com/bar",
        "BAR_ASSISTANT_TOKEN": "token",
        "BAR_ASSISTANT_BAR_ID": "1"
      }
    }
  }
}

```

## Getting Your Bar Assistant API Token

3. **Build and Start**

1. Log into your Bar Assistant instance

2. Navigate to Settings → API```bashOnce configured in VS Code, you can ask natural language questions like:

3. Generate a new API token

4. Copy the token and use it in your configurationnpm run build



## Usage

Once configured, you can interact with the server through your MCP client. Here are some example queries:

*"What cocktails can I make with gin and vermouth?"* 

*"Show me the recipe for a Manhattan"*

*"Give me recommendations on cocktails like a Negroni"*

*"What ingredients do I need to buy to make these 5 cocktails?"*

*"Show me how to make a Manhattan"*

*"What cocktails can I make with gin and vermouth?"*