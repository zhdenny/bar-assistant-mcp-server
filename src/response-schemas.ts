/**
 * Response Schema Types for Bar Assistant MCP Server
 * Provides consistent, structured response formats across all tools
 */

// Base metadata for all responses
export interface ResponseMetadata {
  /** Source of the data (e.g., "bar_assistant_api", "search_results") */
  source: string;
  /** Timestamp when the response was generated */
  timestamp: string;
  /** Number of results returned */
  result_count: number;
  /** Processing time in milliseconds */
  processing_time?: number;
  /** API version or data version */
  version?: string;
}

// Ingredient information structure
export interface IngredientInfo {
  /** Ingredient name */
  name: string;
  /** Amount in the recipe */
  amount?: string;
  /** Units (oz, ml, dash, etc.) */
  units?: string;
  /** Whether ingredient is optional */
  optional?: boolean;
  /** Additional notes about the ingredient */
  note?: string;
  /** Formatted display string (e.g., "2oz Rye Whiskey") */
  formatted?: string;
}

// Instruction step structure
export interface InstructionStep {
  /** Step number (1-based) */
  step: number;
  /** Instruction text */
  instruction: string;
  /** Optional additional notes or tips */
  note?: string;
}

// Cocktail details structure
export interface CocktailDetails {
  /** Alcohol by volume percentage */
  abv?: number;
  /** Glass type */
  glass?: string;
  /** Preparation method */
  method?: string;
  /** Garnish description */
  garnish?: string;
  /** Recipe source */
  source?: string;
  /** Tags associated with the cocktail */
  tags?: string[];
  /** Direct link to cocktail page */
  direct_link?: string;
  /** Direct URL to the main cocktail image */
  image_url?: string;
}

// Single cocktail result structure
export interface CocktailResult {
  /** Cocktail unique identifier */
  id: number;
  /** Cocktail name */
  name: string;
  /** Brief description */
  description?: string;
  /** List of ingredients with measurements */
  ingredients: IngredientInfo[];
  /** Step-by-step instructions */
  instructions: InstructionStep[];
  /** Additional cocktail details */
  details: CocktailDetails;
  /** Confidence score for search results (0-1) */
  confidence?: number;
  /** Recipe slug for URL generation */
  slug?: string;
}

// Structured response for cocktail searches
export interface CocktailSearchResponse {
  /** Primary results matching the search criteria */
  results: CocktailResult[];
  /** Optional similar/related cocktails */
  similar_results?: CocktailResult[];
  /** Search query information */
  query: {
    /** Original search terms */
    terms?: string;
    /** Applied filters */
    filters?: Record<string, any>;
    /** Search type (similarity, ingredient, name, etc.) */
    search_type: string;
  };
  /** Response metadata */
  metadata: ResponseMetadata;
}

// Structured response for single recipe lookups
export interface RecipeResponse {
  /** The main cocktail recipe */
  result: CocktailResult;
  /** Optional recipe variations */
  variations?: CocktailResult[];
  /** Lookup information */
  query: {
    /** Search method used (id, name) */
    method: 'id' | 'name';
    /** Original query value */
    value: string | number;
  };
  /** Response metadata */
  metadata: ResponseMetadata;
}

// Ingredient usage information
export interface IngredientUsage {
  /** Cocktail using this ingredient */
  cocktail: CocktailResult;
  /** How the ingredient is used in this cocktail */
  usage_notes?: string;
}

// Ingredient substitution suggestion
export interface SubstitutionSuggestion {
  /** Suggested substitute ingredient */
  substitute: string;
  /** Explanation of the substitution */
  description: string;
  /** Impact on flavor profile */
  flavor_impact?: string;
}

// Structured response for ingredient information
export interface IngredientInfoResponse {
  /** Ingredient name */
  ingredient: string;
  /** Description or information about the ingredient */
  description?: string;
  /** Cocktails that use this ingredient */
  cocktail_usage: IngredientUsage[];
  /** Suggested substitutes */
  substitutions?: SubstitutionSuggestion[];
  /** Common flavor profiles */
  flavor_profiles?: string[];
  /** Query information */
  query: {
    /** Original ingredient query */
    ingredient_name: string;
  };
  /** Response metadata */
  metadata: ResponseMetadata;
}

// Error response structure
export interface ErrorResponse {
  /** Error message */
  error: string;
  /** Error code or type */
  error_code?: string;
  /** Additional error details */
  details?: string;
  /** Suggestions for resolution */
  suggestions?: string[];
  /** Query that caused the error */
  query?: Record<string, any>;
  /** Response metadata */
  metadata: ResponseMetadata;
}