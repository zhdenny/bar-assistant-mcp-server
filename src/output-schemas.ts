/**
 * JSON Schema definitions for MCP tool output schemas
 * These schemas ensure consistent, validated responses across all tools
 */

export const cocktailResultSchema = {
  type: "object",
  properties: {
    id: { type: "number", description: "Unique cocktail identifier" },
    name: { type: "string", description: "Cocktail name" },
    description: { type: "string", description: "Brief cocktail description" },
    ingredients: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Ingredient name" },
          amount: { type: "string", description: "Amount (e.g., '2oz', '1 dash')" },
          units: { type: "string", description: "Units of measurement" },
          optional: { type: "boolean", description: "Whether ingredient is optional" },
          note: { type: "string", description: "Additional ingredient notes" },
          formatted: { type: "string", description: "Display-ready formatted string" }
        },
        required: ["name"]
      }
    },
    instructions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          step: { type: "number", description: "Step number (1-based)" },
          instruction: { type: "string", description: "Instruction text" },
          note: { type: "string", description: "Optional step notes" }
        },
        required: ["step", "instruction"]
      }
    },
    details: {
      type: "object",
      properties: {
        abv: { type: "number", description: "Alcohol by volume percentage" },
        glass: { type: "string", description: "Recommended glass type" },
        method: { type: "string", description: "Preparation method" },
        garnish: { type: "string", description: "Garnish description" },
        source: { type: "string", description: "Recipe source" },
        tags: { type: "array", items: { type: "string" }, description: "Recipe tags" },
        direct_link: { type: "string", description: "Direct URL to cocktail page" },
        image_url: { type: "string", description: "Direct URL to the main cocktail image" }
      }
    },
    confidence: { type: "number", minimum: 0, maximum: 1, description: "Search confidence score" },
    slug: { type: "string", description: "URL slug for the cocktail" }
  },
  required: ["id", "name", "ingredients", "instructions", "details"]
};

export const responseMetadataSchema = {
  type: "object",
  properties: {
    source: { type: "string", description: "Data source identifier" },
    timestamp: { type: "string", format: "date-time", description: "Response generation timestamp" },
    result_count: { type: "number", description: "Number of results returned" },
    processing_time: { type: "number", description: "Processing time in milliseconds" },
    version: { type: "string", description: "API or data version" }
  },
  required: ["source", "timestamp", "result_count"]
};

export const cocktailSearchOutputSchema = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: cocktailResultSchema,
      description: "Primary cocktail search results"
    },
    similar_results: {
      type: "array",
      items: cocktailResultSchema,
      description: "Similar or related cocktails"
    },
    query: {
      type: "object",
      properties: {
        terms: { type: "string", description: "Original search terms" },
        filters: { type: "object", description: "Applied search filters" },
        search_type: { type: "string", description: "Type of search performed" }
      },
      required: ["search_type"]
    },
    metadata: responseMetadataSchema
  },
  required: ["results", "query", "metadata"]
};

export const recipeOutputSchema = {
  type: "object",
  properties: {
    result: cocktailResultSchema,
    variations: {
      type: "array",
      items: cocktailResultSchema,
      description: "Recipe variations or similar cocktails"
    },
    query: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["id", "name"], description: "Lookup method used" },
        value: { oneOf: [{ type: "string" }, { type: "number" }], description: "Query value" }
      },
      required: ["method", "value"]
    },
    metadata: responseMetadataSchema
  },
  required: ["result", "query", "metadata"]
};

export const ingredientInfoOutputSchema = {
  type: "object",
  properties: {
    ingredient: { type: "string", description: "Ingredient name" },
    description: { type: "string", description: "Ingredient description" },
    cocktail_usage: {
      type: "array",
      items: {
        type: "object",
        properties: {
          cocktail: cocktailResultSchema,
          usage_notes: { type: "string", description: "How ingredient is used" }
        },
        required: ["cocktail"]
      },
      description: "Cocktails using this ingredient"
    },
    substitutions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          substitute: { type: "string", description: "Substitute ingredient" },
          description: { type: "string", description: "Substitution explanation" },
          flavor_impact: { type: "string", description: "Impact on flavor" }
        },
        required: ["substitute", "description"]
      },
      description: "Ingredient substitution suggestions"
    },
    flavor_profiles: {
      type: "array",
      items: { type: "string" },
      description: "Common flavor characteristics"
    },
    query: {
      type: "object",
      properties: {
        ingredient_name: { type: "string", description: "Queried ingredient name" }
      },
      required: ["ingredient_name"]
    },
    metadata: responseMetadataSchema
  },
  required: ["ingredient", "cocktail_usage", "query", "metadata"]
};

export const errorOutputSchema = {
  type: "object",
  properties: {
    error: { type: "string", description: "Error message" },
    error_code: { type: "string", description: "Error code or type" },
    details: { type: "string", description: "Additional error details" },
    suggestions: {
      type: "array",
      items: { type: "string" },
      description: "Suggestions for resolution"
    },
    query: { type: "object", description: "Query that caused the error" },
    metadata: responseMetadataSchema
  },
  required: ["error", "metadata"]
};