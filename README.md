# Bar Assistant MCP Server

A high-performance Model Context Protocol (MCP) server that provides intelligent cocktail search and recipe retrieval from [Bar Assistant](https://github.com/karlomikus/bar-assistant) instances.

## Features

- 🔍 **Smart Cocktail Search** - Natural language queries with similarity matching
- 📖 **Complete Recipes** - Detailed ingredients, instructions, and specifications
- 🎯 **Similarity Engine** - Discover cocktails similar to your favorites
- 🧪 **Ingredient Analysis** - Find cocktails by ingredients, flavors, and characteristics
- ⚡ **Batch Processing** - Retrieve multiple recipes simultaneously (5-10x faster)
- 💾 **Smart Caching** - Intelligent caching with 70%+ hit rate
- 🔧 **Advanced Filtering** - ABV ranges, glassware, preparation methods, and more

## Prerequisites

- Docker and Docker Compose
- Access to a Bar Assistant instance
- Bar Assistant API token

## Running with Docker

The only supported method for running the server is with Docker Compose.

1.  **Create an `.env` file:**

    Create a file named `.env` in the root of the project and add the following, replacing the placeholder values with your actual Bar Assistant configuration:

    ```
    BAR_ASSISTANT_URL=https://your-instance.com
    BAR_ASSISTANT_TOKEN=your-api-token
    BAR_ASSISTANT_BAR_ID=1
    ```

2.  **Get Your Bar Assistant API Token:**

    1.  Log into your Bar Assistant instance
    2.  Navigate to **Settings → API**
    3.  Generate a new API token
    4.  Copy the token and paste it into the `BAR_ASSISTANT_TOKEN` field in your `.env` file.

3.  **Build and start the container:**

    ```bash
    docker-compose up --build -d
    ```

    The server will be available at `http://localhost:3001`.

## Usage

Once configured, you can interact with the server through your MCP client. Here are some example queries:

- *"What cocktails can I make with gin and vermouth?"*
- *"Show me the recipe for a Manhattan"*
- *"Give me recommendations on cocktails like a Negroni"*
- *"What ingredients do I need to buy to make these 5 cocktails?"*
- *"Show me how to make a Manhattan"*
- *"What cocktails can I make with gin and vermouth?"*