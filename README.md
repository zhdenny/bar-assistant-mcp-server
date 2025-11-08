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



## Prerequisites- 🔍 **Smart Search**: Natural language cocktail discovery with similarity matching- 📖 **Recipe Details** - Get complete recipes with ingredients and instructions  



- Node.js 18 or higher- 🧪 **Ingredient Analysis**: Find cocktails by ingredients, flavors, and characteristics  - 🎯 **Smart Recommendations** - Find similar cocktails based on flavor profiles

- Access to a Bar Assistant instance

- Bar Assistant API token- 🎯 **Advanced Filtering**: ABV ranges, glassware, preparation methods, and more- 📦 **Inventory Management** - Check what you can make with available ingredients



## Installation- 🔄 **Similarity Engine**: Discover cocktails similar to favorites- 🛒 **Shopping Lists** - Generate ingredient lists for multiple cocktails



1. **Clone the repository:**



```bash### **High-Performance Recipe Retrieval**## Setup

git clone <your-repository-url>

cd bar-assistant-mcp-server- 📖 **Complete Recipes**: Detailed ingredients, instructions, and specifications

```

- 🍸 **Batch Processing**: Retrieve multiple recipes simultaneously (5-10x faster)### Prerequisites

2. **Install dependencies:**

- ⚡ **Smart Caching**: Intelligent caching system with 70%+ hit rate

```bash

npm install- 🔗 **Direct Links**: Database links for complete cocktail information- Node.js 18+ 

```

- Access to a Bar Assistant instance

3. **Build the server:**

### **Advanced Performance Features**- Bar Assistant API token

```bash

npm run build- 🚀 **Parallel Processing**: Simultaneous API calls with error isolation

```

- 💾 **Intelligent Caching**: 5-minute TTL with smart eviction policies### Installation

## Configuration

- 🛡️ **Error Resilience**: Individual failures don't break batch operations

### Environment Variables

- 📊 **Performance Metrics**: Built-in timing and optimization analytics1. **Clone and install dependencies:**

Set the following environment variables or configure them in your MCP client:

```bash

```bash

export BAR_ASSISTANT_URL="https://your-bar-assistant-instance.com"## 🛠️ Installationnpm install

export BAR_ASSISTANT_TOKEN="your-api-token-here"

export BAR_ASSISTANT_BAR_ID="1"  # Optional, defaults to "1"```

```

### Prerequisites

### VS Code Configuration

- Node.js 18+2. **Configure your Bar Assistant connection:**

If using with VS Code, create or update `.vscode/mcp.json`:

- TypeScript 4.5+Edit `.vscode/mcp.json` or set environment variables:

```jsonc

{- Access to Bar Assistant API instance```bash

  "servers": {

    "bar-assistant": {export BAR_ASSISTANT_URL="https://your-bar-assistant-url"

      "command": "node",

      "args": ["dist/src/bar-assistant-mcp-server.js"],### Setupexport BAR_ASSISTANT_TOKEN="your-api-token"

      "env": {

        "BAR_ASSISTANT_URL": "https://your-bar-assistant-instance.com",```

        "BAR_ASSISTANT_TOKEN": "your-api-token-here",

        "BAR_ASSISTANT_BAR_ID": "1"1. **Clone and Install**

      }

    }```bash3. **Build the server:**

  }

}git clone <repository-url>```bash

```

cd BarAssistant/Round2npm run build

### Claude Desktop Configuration

npm install```

Add to your Claude Desktop config file (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```

```jsonc

{4. **Test the connection:**

  "mcpServers": {

    "bar-assistant": {2. **Configure Environment**```bash

      "command": "node",

      "args": ["/absolute/path/to/dist/src/bar-assistant-mcp-server.js"],```bashnpm test

      "env": {

        "BAR_ASSISTANT_URL": "https://your-bar-assistant-instance.com",# Create .env file```

        "BAR_ASSISTANT_TOKEN": "your-api-token-here",

        "BAR_ASSISTANT_BAR_ID": "1"echo "BAR_ASSISTANT_URL=http://your-bar-assistant-instance" > .env

      }

    }echo "BAR_ASSISTANT_API_KEY=your-api-key" >> .env## Usage

  }

}```

```

### With GitHub Copilot

## Getting Your Bar Assistant API Token

3. **Build and Start**

1. Log into your Bar Assistant instance

2. Navigate to Settings → API```bashOnce configured in VS Code, you can ask natural language questions like:

3. Generate a new API token

4. Copy the token and use it in your configurationnpm run build



## Usagenpm start- *"Give me recommendations on cocktails like a Negroni"*



Once configured, you can interact with the server through your MCP client. Here are some example queries:```- *"What cocktails can I make with gin and vermouth?"* 



### Finding Similar Cocktails- *"Show me the recipe for a Manhattan"*



*"Give me recommendations on cocktails like a Negroni"*## 🎯 MCP Tools- *"What ingredients do I need to buy to make these 5 cocktails?"*



### Recipe Lookup



*"Show me how to make a Manhattan"*### 1. `smart_search_cocktails` - Intelligent Discovery Engine### Available MCP Tools



### Ingredient-Based Search



*"What cocktails can I make with gin and vermouth?"***Primary Use Cases:**#### `search_cocktails`



### Shopping Lists- Cocktail discovery and explorationSearch for cocktails with various filters:



*"What ingredients do I need to buy to make these 5 cocktails?"*- Similarity-based recommendations  ```typescript



## Available Tools- Ingredient-based searches{



### `smart_search_cocktails`- Complex filtering and analysis  query?: string,           // Name search



Intelligent cocktail discovery with similarity matching and advanced filtering.  ingredient?: string,      // Ingredient filter  



**Parameters:****Key Features:**  base_spirit?: string,     // Spirit type

- `query` (string): Natural language search query

- `similar_to` (string): Find cocktails similar to this name- 🔄 **Batch Processing**: Parallel search with intelligent caching  abv_min?: number,        // Minimum ABV

- `similar_to_id` (number): Find cocktails similar to this ID

- `ingredient` (string): Filter by primary ingredient- 🎯 **Multi-Filter Support**: Combine ingredients, ABV, flavors, methods  abv_max?: number,        // Maximum ABV  

- `must_include` (string[]): Required ingredients

- `must_exclude` (string[]): Excluded ingredients- 📊 **Complete Results**: Full recipes with all details included  can_make?: boolean,      // Only makeable cocktails

- `preferred_flavors` (string[]): Flavor profiles (bitter, sweet, sour, spicy, herbal)

- `preferred_strength` (string): Alcohol strength (light, medium, strong)- ⚡ **High Performance**: Optimized for complex queries  limit?: number           // Max results

- `abv_min` (number): Minimum ABV percentage

- `abv_max` (number): Maximum ABV percentage}

- `glass_type` (string): Required glassware

- `preparation_method` (string): Required method (shake, stir, build)**Example Usage:**```

- `limit` (number): Maximum results (default: 20)

```json

### `get_recipe`

{#### `get_cocktail_recipe`

Retrieve detailed recipes with batch processing support.

  "similar_to": "Negroni",Get detailed recipe by cocktail ID:

**Parameters:**

- `cocktail_id` (number): Single cocktail ID  "preferred_flavors": ["bitter"],```typescript

- `cocktail_name` (string): Single cocktail name

- `cocktail_ids` (number[]): Multiple cocktail IDs (batch)  "abv_min": 20,{ cocktail_id: number }

- `cocktail_names` (string[]): Multiple cocktail names (batch)

- `include_variations` (boolean): Include similar recipes  "limit": 15```

- `limit` (number): Maximum results for batch (default: 10, max: 20)

}

### `get_ingredient_info`

```#### `find_similar_cocktails`

Get comprehensive ingredient information and usage across cocktails.

Find cocktails similar to a given drink:

**Parameters:**

- `ingredient_name` (string): Name of the ingredient to research### 2. `get_recipe` - Advanced Recipe Retrieval```typescript



## Testing{ 



Run the test suite to verify your configuration:**Primary Use Cases:**  cocktail_id: number,



```bash- Specific recipe lookups  limit?: number 

npm test

```- Batch recipe collection}



This will test:- Recipe comparisons```

- API connectivity and authentication

- Cocktail search functionality- Menu planning

- Recipe retrieval

- Similarity search#### `check_inventory`

- Inventory management

**Key Features:**Check bar inventory status:

## Development

- 🚀 **Batch Processing**: Multiple recipes in single request```typescript

### Watch Mode

- 🔄 **Mixed Input Types**: Names, IDs, or combinations{ ingredient_names?: string[] }

```bash

npm run dev- 📖 **Complete Details**: Ingredients, instructions, specifications```

```

- 🎯 **Variation Support**: Include similar recipes

### Build Only

#### `generate_shopping_list`

```bash

npm run build**Example Usage:**Create shopping list for cocktails:

```

```json```typescript

### Clean Build

{{ cocktail_ids: number[] }

```bash

rm -rf dist && npm run build  "cocktail_names": ["Manhattan", "Negroni", "Martini"],```

```

  "include_variations": true,

## Performance

  "limit": 5## Testing

The server includes several performance optimizations:

}

- **Batch Processing**: 5-10x faster than sequential requests

- **Smart Caching**: 70%+ cache hit rate with 5-minute TTL```### Run All Tests

- **Parallel API Calls**: Simultaneous requests with error isolation

- **Intelligent Retries**: Automatic retry with exponential backoff```bash



Typical performance:### 3. `get_ingredient_info` - Ingredient Intelligencenpm test

- Single recipe: 150-300ms (cached: <50ms)

- Batch (3 cocktails): 250-400ms vs 1500ms+ sequential```

- Batch (5 cocktails): 300-500ms vs 2500ms+ sequential

**Features:**

## Project Structure

- Detailed ingredient information and characteristics### Test Specific Scenario

```

├── src/- Usage examples across cocktail database```bash

│   ├── bar-assistant-mcp-server.ts    # Main MCP server

│   ├── bar-assistant-client.ts        # Bar Assistant API client- Substitution recommendations# Test the main Negroni recommendation scenario

│   ├── cache-manager.ts               # Caching system

│   ├── query-parser.ts                # Natural language processing- Flavor profile analysisnpm run test -- negroni

│   ├── types.ts                       # TypeScript interfaces

│   ├── response-schemas.ts            # Response type definitions```

│   └── output-schemas.ts              # Output format schemas

├── test/## ⚡ Performance Optimizations

│   └── run-tests.ts                   # Test suite

├── package.json                       # Dependencies & scripts### Manual Testing

└── tsconfig.json                      # TypeScript configuration

```### **Batch Processing System**```bash



## Error Handling- **Single Recipe**: ~150-300ms (cached responses <50ms)# Start the MCP server directly



The server implements comprehensive error handling:- **Batch (3 cocktails)**: ~250-400ms vs 1500ms+ sequentialnpm start



- **API Failures**: Automatic retry with exponential backoff- **Batch (5 cocktails)**: ~300-500ms vs 2500ms+ sequential

- **Invalid Requests**: Clear error messages with suggestions

- **Batch Failures**: Individual error isolation with partial results- **Cache Hit Rate**: 70%+ for popular cocktails# Or run in development mode

- **Cache Issues**: Graceful fallback to API calls

- **Network Problems**: Timeout handling with informative responsesnpm run dev



## Troubleshooting### **Smart Caching**```



### Server Won't Start- 5-minute TTL for recipe data



- Check Node.js version: `node --version` (requires 18+)- Intelligent eviction based on access patterns## Example Interactions

- Verify environment variables are set

- Ensure Bar Assistant instance is accessible- Automatic cache warming for popular cocktails



### Authentication Errors- Performance metrics included in all responses### Finding Negroni Alternatives



- Verify your API token is correct

- Check token hasn't expired

- Ensure user has proper permissions in Bar Assistant### **Error Handling****Query:** *"Give me recommendations on cocktails like a Negroni"*



### Empty Results- Individual request isolation in batches



- Check cocktail name spelling- Graceful fallback for API failures**Response:**

- Verify Bar Assistant database has cocktails

- Try broader search terms- Partial results when some requests fail```

- Use `smart_search_cocktails` to discover available cocktails

- Comprehensive error reportingBased on your Bar Assistant database, here are cocktails similar to a Negroni:

### Performance Issues



- Use batch processing for multiple requests

- Check cache is working (look for "(cached)" in responses)## 🔧 Architecture1. **Boulevardier** - 28.5% ABV

- Verify network connectivity to Bar Assistant instance

   Ingredients: Bourbon, Campari, Sweet Vermouth  

## Contributing

### **Core Components**   Why similar: Same base bitters, similar preparation method

1. Fork the repository

2. Create a feature branch- **BarAssistantClient**: API interface with retry logic

3. Make your changes with tests

4. Ensure TypeScript compilation passes: `npm run build`- **CacheManager**: Intelligent caching with TTL management2. **Americano** - 8.2% ABV

5. Run tests: `npm test`

6. Submit a pull request- **QueryParser**: Natural language query enhancement   Ingredients: Campari, Sweet Vermouth, Soda Water



## License- **ResponseFormatter**: Rich text formatting with structured data   Why similar: Shared ingredients: Campari, Sweet Vermouth



MIT License - See LICENSE file for details```



## About Bar Assistant### **Batch Processing Engine**



This server integrates with [Bar Assistant](https://github.com/karlomikus/bar-assistant), a self-hosted cocktail recipe management application. Bar Assistant provides:- Parallel API calls using Promise.allSettled### Recipe Lookup



- Comprehensive cocktail database- Batch optimization in groups of 5 requests

- Recipe management with ingredients

- Bar inventory tracking- Smart name resolution with caching**Query:** *"Show me how to make a Manhattan"*

- Shopping list generation

- REST API with authentication- Error isolation preventing cascade failures



## Support**Response:**



For issues, questions, or feature requests:### **Performance Monitoring**```

- Check existing documentation

- Review test suite for examples- Built-in timing for all operations# Manhattan

- Create GitHub issues for bugs and features

- Cache hit/miss statistics

---

- API call optimization metrics**Description:** A classic whiskey cocktail with sweet vermouth

**Built for the cocktail community** 🍸

- Response time tracking**ABV:** 29.5%

*Enabling natural language interactions with your cocktail database through AI assistants.*

**Glass:** Coupe

## 📊 API Response Format**Method:** Stirred



All tools return structured responses with:## Ingredients

• 60ml Rye Whiskey

```typescript• 30ml Sweet Vermouth  

{• 2 dashes Angostura Bitters

  content: [{

    type: 'text',## Instructions

    text: string // Rich formatted content with emojis and structure1. Add all ingredients to mixing glass with ice

  }],2. Stir until well chilled

  3. Strain into chilled coupe glass

  // Embedded structured data includes:4. Garnish with maraschino cherry

  recipes: Recipe[],           // Complete cocktail data```

  performance: {               // Performance metrics

    processing_time_ms: number,## Project Structure

    cache_hits: number,

    batch_processing_used: boolean```

  },├── src/

  search_metadata: {           // Search context│   ├── bar-assistant-mcp-server.ts    # Main MCP server

    strategy_used: string,│   ├── bar-assistant-client.ts        # API client  

    filters_applied: string[]│   └── types.ts                       # TypeScript interfaces

  }├── test/

}│   └── run-tests.ts                   # Test suite

```├── .vscode/

│   └── mcp.json                       # MCP configuration

## 🎯 Integration Examples├── package.json                       # Dependencies & scripts

└── tsconfig.json                      # TypeScript config

### **Single Recipe Lookup**```

```json

{## Configuration

  "name": "get_recipe",

  "arguments": {The server can be configured via environment variables or the MCP configuration file:

    "cocktail_name": "Manhattan"

  }| Variable | Description | Default |

}|----------|-------------|---------|

```| `BAR_ASSISTANT_URL` | Base URL of your Bar Assistant instance | - |

| `BAR_ASSISTANT_TOKEN` | API authentication token | - |

### **High-Performance Batch Retrieval**

```json## Error Handling

{

  "name": "get_recipe", The server includes comprehensive error handling for:

  "arguments": {

    "cocktail_names": ["Manhattan", "Negroni", "Martini", "Old Fashioned"],- ✅ API authentication failures

    "limit": 4- ✅ Network connectivity issues  

  }- ✅ Invalid queries and parameters

}- ✅ Empty search results

```- ✅ Missing recipe data

- ✅ Rate limiting

### **Intelligent Discovery**

```json## Development

{

  "name": "smart_search_cocktails",### Watch Mode

  "arguments": {```bash

    "ingredient": "gin",npm run dev

    "must_include": ["vermouth"],```

    "preferred_strength": "strong",

    "limit": 20### Build Only

  }```bash

}npm run build  

``````



### **Similarity-Based Recommendations**### Clean Build

```json```bash

{npm run clean && npm run build

  "name": "smart_search_cocktails",```

  "arguments": {

    "similar_to": "Aviation",## Contributing

    "must_exclude": ["egg white"],

    "limit": 101. Ensure all tests pass: `npm test`

  }2. Add tests for new functionality

}3. Follow the existing code style

```4. Update documentation as needed



## 🔄 Migration from v1## Bar Assistant API



The enhanced v2 system maintains full backwards compatibility while adding powerful new features:This server integrates with [Bar Assistant](https://github.com/karlomikus/bar-assistant), a self-hosted cocktail recipe management application.



- ✅ **All existing requests work unchanged**### Required Bar Assistant Features:

- 🚀 **New batch processing capabilities** - Cocktail search and filtering

- ⚡ **Automatic performance improvements**- Recipe management with ingredients

- 📊 **Enhanced response formatting**- API access with authentication tokens

- 💾 **Smart caching benefits**

## License

## 🛡️ Error Handling

MIT License - see LICENSE file for details.
The server implements comprehensive error handling:

- **API Failures**: Automatic retry with exponential backoff
- **Invalid Requests**: Clear error messages with suggestions
- **Batch Failures**: Individual error isolation with partial results
- **Cache Issues**: Graceful fallback to API calls
- **Network Problems**: Timeout handling with informative responses

## 📈 Monitoring and Analytics

Built-in performance monitoring provides:

- **Response Times**: All operations timed automatically
- **Cache Performance**: Hit/miss ratios and optimization insights
- **Batch Efficiency**: Parallel processing metrics
- **Error Rates**: Failure analysis and recovery statistics
- **API Usage**: Call frequency and optimization opportunities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Ensure TypeScript compilation passes
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🎯 Support

For issues, feature requests, or questions:
- Create GitHub issues for bugs and features
- Check existing documentation for common questions
- Review the QUICKSTART.md for implementation guidance

---

**Built with ❤️ for the cocktail community**

*Transforming cocktail discovery through intelligent search and high-performance batch processing.*
