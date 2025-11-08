# Bar Assistant MCP Server

A Model Context Protocol (MCP) server that integrates with Bar Assistant, enabling natural language interactions with your cocktail database through AI assistants like GitHub Copilot.

<a href="https://glama.ai/mcp/servers/@zhdenny/bar-assistant-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@zhdenny/bar-assistant-mcp-server/badge" alt="Bar Assistant Server MCP server" />
</a>

## 🚀 Features

### **Intelligent Cocktail Discovery**

- 🔍 **Smart Search**: Natural language cocktail discovery with similarity matching
- 🧪 **Ingredient Analysis**: Find cocktails by ingredients, flavors, and characteristics  
- 🎯 **Advanced Filtering**: ABV ranges, glassware, preparation methods, and more
- 🎯 **Smart Recommendations** - Find similar cocktails based on flavor profiles
- 📦 **Inventory Management** - Check what you can make with available ingredients
- 🛒 **Shopping Lists** - Generate ingredient lists for multiple cocktails

### **High-Performance Recipe Retrieval**

- 📖 **Complete Recipes**: Detailed ingredients, instructions, and specifications
- 🍸 **Batch Processing**: Retrieve multiple recipes simultaneously (5-10x faster)
- ⚡ **Smart Caching**: Intelligent caching system with 70%+ hit rate
- 🔗 **Direct Links**: Database links for complete cocktail information

### **Advanced Performance Features**

- 🚀 **Parallel Processing**: Simultaneous API calls with error isolation
- 💾 **Intelligent Caching**: 5-minute TTL with smart eviction policies
- 🛡️ **Error Resilience**: Individual failures don't break batch operations
- 📊 **Performance Metrics**: Built-in timing and optimization analytics

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- Access to a Bar Assistant instance
- Bar Assistant API token

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure your Bar Assistant connection:**

Edit `.vscode/mcp.json` or set environment variables:

```bash
export BAR_ASSISTANT_URL="https://your-bar-assistant-url"
export BAR_ASSISTANT_TOKEN="your-api-token"
```

3. **Build the server:**

```bash
npm run build
```

4. **Test the connection:**

```bash
npm test
```

## Usage

### With GitHub Copilot

Once configured in VS Code, you can ask natural language questions like:

- *"Give me recommendations on cocktails like a Negroni"*
- *"What cocktails can I make with gin and vermouth?"* 
- *"Show me the recipe for a Manhattan"*
- *"What ingredients do I need to buy to make these 5 cocktails?"*

### Available MCP Tools

#### `search_cocktails`

Search for cocktails with various filters:

```typescript
{
  query?: string,           // Name search
  ingredient?: string,      // Ingredient filter  
  base_spirit?: string,     // Spirit type
  abv_min?: number,        // Minimum ABV
  abv_max?: number,        // Maximum ABV  
  can_make?: boolean,      // Only makeable cocktails
  limit?: number           // Max results
}
```

#### `get_cocktail_recipe`

Get detailed recipe by cocktail ID:

```typescript
{ cocktail_id: number }
```

#### `find_similar_cocktails`

Find cocktails similar to a given drink:

```typescript
{ 
  cocktail_id: number,
  limit?: number 
}
```

#### `check_inventory`

Check bar inventory status:

```typescript
{ ingredient_names?: string[] }
```

#### `generate_shopping_list`

Create shopping list for cocktails:

```typescript
{ cocktail_ids: number[] }
```

## Testing

### Run All Tests

```bash
npm test
```

### Test Specific Scenario

```bash
# Test the main Negroni recommendation scenario
npm run test -- negroni
```

### Manual Testing

```bash
# Start the MCP server directly
npm start

# Or run in development mode
npm run dev
```

## Example Interactions

### Finding Negroni Alternatives

**Query:** *"Give me recommendations on cocktails like a Negroni"*

**Response:**
```
Based on your Bar Assistant database, here are cocktails similar to a Negroni:

1. **Boulevardier** - 28.5% ABV
   Ingredients: Bourbon, Campari, Sweet Vermouth  
   Why similar: Same base bitters, similar preparation method

2. **Americano** - 8.2% ABV
   Ingredients: Campari, Sweet Vermouth, Soda Water
   Why similar: Shared ingredients: Campari, Sweet Vermouth
```

### Recipe Lookup

**Query:** *"Show me how to make a Manhattan"*

**Response:**
```
# Manhattan

**Description:** A classic whiskey cocktail with sweet vermouth

**ABV:** 29.5%

**Glass:** Coupe

**Method:** Stirred

## Ingredients

• 60ml Rye Whiskey
• 30ml Sweet Vermouth  
• 2 dashes Angostura Bitters

## Instructions

1. Add all ingredients to mixing glass with ice
2. Stir until well chilled
3. Strain into chilled coupe glass
4. Garnish with maraschino cherry
```

## Project Structure

```
├── src/
│   ├── bar-assistant-mcp-server.ts    # Main MCP server
│   ├── bar-assistant-client.ts        # API client  
│   └── types.ts                       # TypeScript interfaces
├── test/
│   └── run-tests.ts                   # Test suite
├── .vscode/
│   └── mcp.json                       # MCP configuration
├── package.json                       # Dependencies & scripts
└── tsconfig.json                      # TypeScript config
```

## Configuration

The server can be configured via environment variables or the MCP configuration file:

| Variable | Description | Default |
|----------|-------------|---------|
| `BAR_ASSISTANT_URL` | Base URL of your Bar Assistant instance | - |
| `BAR_ASSISTANT_TOKEN` | API authentication token | - |

## Error Handling

The server includes comprehensive error handling for:

- ✅ API authentication failures
- ✅ Network connectivity issues  
- ✅ Invalid queries and parameters
- ✅ Empty search results
- ✅ Missing recipe data
- ✅ Rate limiting

## Development

### Watch Mode

```bash
npm run dev
```

### Build Only

```bash
npm run build  
```

### Clean Build

```bash
npm run clean && npm run build
```

## Contributing

1. Ensure all tests pass: `npm test`
2. Add tests for new functionality
3. Follow the existing code style
4. Update documentation as needed

## Bar Assistant API

This server integrates with [Bar Assistant](https://github.com/karlomikus/bar-assistant), a self-hosted cocktail recipe management application.

### Required Bar Assistant Features:

- Cocktail search and filtering
- Recipe management with ingredients
- API access with authentication tokens

## License

MIT License - see LICENSE file for details.

## ⚡ Performance Optimizations

### **Batch Processing System**

- **Single Recipe**: ~150-300ms (cached responses <50ms)
- **Batch (3 cocktails)**: ~250-400ms vs 1500ms+ sequential
- **Batch (5 cocktails)**: ~300-500ms vs 2500ms+ sequential
- **Cache Hit Rate**: 70%+ for popular cocktails

### **Smart Caching**

- 5-minute TTL for recipe data
- Intelligent eviction based on access patterns
- Automatic cache warming for popular cocktails
- Performance metrics included in all responses

### **Error Handling**

- Individual request isolation in batches
- Graceful fallback for API failures
- Partial results when some requests fail
- Comprehensive error reporting

## 🔧 Architecture

### **Core Components**

- **BarAssistantClient**: API interface with retry logic
- **CacheManager**: Intelligent caching with TTL management
- **QueryParser**: Natural language query enhancement
- **ResponseFormatter**: Rich text formatting with structured data

### **Batch Processing Engine**

- Parallel API calls using Promise.allSettled
- Batch optimization in groups of 5 requests
- Smart name resolution with caching
- Error isolation preventing cascade failures

### **Performance Monitoring**

- Built-in timing for all operations
- Cache hit/miss statistics
- API call optimization metrics
- Response time tracking

## 📊 API Response Format

All tools return structured responses with:

```typescript
{
  content: [{
    type: 'text',
    text: string // Rich formatted content with emojis and structure
  }],
  
  // Embedded structured data includes:
  recipes: Recipe[],           // Complete cocktail data
  performance: {               // Performance metrics
    processing_time_ms: number,
    cache_hits: number,
    batch_processing_used: boolean
  },
  search_metadata: {           // Search context
    strategy_used: string,
    filters_applied: string[]
  }
}
```

## 🎯 Integration Examples

### **Single Recipe Lookup**

```json
{
  "name": "get_recipe",
  "arguments": {
    "cocktail_name": "Manhattan"
  }
}
```

### **High-Performance Batch Retrieval**

```json
{
  "name": "get_recipe",
  "arguments": {
    "cocktail_names": ["Manhattan", "Negroni", "Martini", "Old Fashioned"],
    "limit": 4
  }
}
```

### **Intelligent Discovery**

```json
{
  "name": "smart_search_cocktails",
  "arguments": {
    "ingredient": "gin",
    "must_include": ["vermouth"],
    "preferred_strength": "strong",
    "limit": 20
  }
}
```

### **Similarity-Based Recommendations**

```json
{
  "name": "smart_search_cocktails",
  "arguments": {
    "similar_to": "Aviation",
    "must_exclude": ["egg white"],
    "limit": 10
  }
}
```

## 🔄 Migration from v1

The enhanced v2 system maintains full backwards compatibility while adding powerful new features:

- ✅ **All existing requests work unchanged**
- 🚀 **New batch processing capabilities**
- ⚡ **Automatic performance improvements**
- 📊 **Enhanced response formatting**
- 💾 **Smart caching benefits**

## 🛡️ Error Handling

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