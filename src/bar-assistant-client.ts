import axios, { AxiosInstance, AxiosResponse } from 'axios';
import {
  BarAssistantConfig,
  CocktailSearchResult,
  DetailedRecipe,
  SearchCocktailsParams,
  SimilarCocktail,
  InventoryStatus,
  ShoppingList,
  ShoppingListParams,
  InventoryCheckParams,
  BarIngredient,
  ApiError,
  CocktailCollection
} from './types.js';

/**
 * Bar Assistant API Client
 * Handles all interactions with the Bar Assistant REST API
 */
export class BarAssistantClient {
  private client: AxiosInstance;
  private config: BarAssistantConfig;

  constructor(config: BarAssistantConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${config.token.replace(/\s/g, '')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Bar-Assistant-Bar-Id': config.barId || '1', // Default bar ID
      },
    });

    // Add request/response interceptors for logging and error handling
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const apiError: ApiError = {
          message: error.response?.data?.message || error.message || 'Unknown API error',
          status: error.response?.status || 500,
          errors: error.response?.data?.errors,
        };
        return Promise.reject(apiError);
      }
    );
  }

  /**
   * Test API connectivity and authentication
   */
  async ping(): Promise<{ status: string; authenticated: boolean }> {
    try {
      // Try to get user profile first - this should work if authenticated
      const response = await this.client.get('/api/profile');
      return {
        status: 'connected',
        authenticated: response.status === 200,
      };
    } catch (error) {
      const apiError = error as ApiError;
      // If profile fails, try a simple endpoint that might not need bar context
      try {
        const fallbackResponse = await this.client.get('/api/ingredients?per_page=1');
        return {
          status: 'connected',
          authenticated: fallbackResponse.status === 200,
        };
      } catch (fallbackError) {
        return {
          status: 'error',
          authenticated: apiError.status !== 401,
        };
      }
    }
  }

  /**
   * Search for cocktails with various filters
   */
  async searchCocktails(params: SearchCocktailsParams = {}): Promise<CocktailSearchResult> {
    const searchParams = new URLSearchParams();
    
    if (params.query) searchParams.append('filter[name]', params.query);
    if (params.ingredient) searchParams.append('filter[ingredient_name]', params.ingredient);
    if (params.base_spirit) searchParams.append('filter[base_spirit]', params.base_spirit);
    if (params.abv_min !== undefined) searchParams.append('filter[abv_min]', params.abv_min.toString());
    if (params.abv_max !== undefined) searchParams.append('filter[abv_max]', params.abv_max.toString());
    if (params.can_make !== undefined) searchParams.append('filter[can_make]', params.can_make ? '1' : '0');
    if (params.limit) searchParams.append('per_page', params.limit.toString());
    if (params.page) searchParams.append('page', params.page.toString());

    // Always include ingredients and other related data - try different include formats
    searchParams.append('include', 'ingredients,tags,glass,method,images');

    const response: AxiosResponse<CocktailSearchResult> = await this.client.get(
      `/api/cocktails?${searchParams.toString()}`
    );
    return response.data;
  }

  /**
   * Get detailed cocktail recipe by ID
   */
  async getCocktailRecipe(cocktailId: number): Promise<DetailedRecipe> {
    // Try different include parameters to get ingredients and instructions
    const response: AxiosResponse<{ data: DetailedRecipe }> = await this.client.get(
      `/api/cocktails/${cocktailId}?include=ingredients,instructions,tags,glass,method,images`
    );
    return response.data.data; // Extract the nested data
  }

  /**
   * Find cocktails similar to the given cocktail ID
   */
  async findSimilarCocktails(cocktailId: number, limit: number = 10): Promise<SimilarCocktail[]> {
    try {
      // First get the base cocktail to understand its profile
      const baseCocktail = await this.getCocktailRecipe(cocktailId);
      
      // Extract key ingredients for similarity matching - use short_ingredients for consistency
      const baseIngredients = (baseCocktail.short_ingredients || baseCocktail.ingredients)?.map((ing: any) => {
        const name = ing.ingredient?.name || ing.name || 'unknown';
        return name.toLowerCase();
      }) || [];
      
      // Get a broader set of cocktails to analyze for similarity
      const searchParams: SearchCocktailsParams = {
        limit: Math.min(limit * 10, 100), // Get many more results to properly analyze
      };

      // Try multiple search strategies to find potentially similar cocktails
      const allPotentialMatches = new Map<number, any>();
      
      // Strategy 1: Search by each key ingredient
      for (const ingredient of baseIngredients.slice(0, 3)) { // Top 3 ingredients
        try {
          const results = await this.searchCocktails({ 
            ingredient: ingredient, 
            limit: 50 
          });
          results.data.forEach(cocktail => {
            if (cocktail.id !== cocktailId) {
              allPotentialMatches.set(cocktail.id, cocktail);
            }
          });
        } catch (error) {
          // Continue if one ingredient search fails
        }
      }
      
      // Strategy 2: If we don't have enough matches, do a general search
      if (allPotentialMatches.size < limit * 3) {
        try {
          const generalResults = await this.searchCocktails(searchParams);
          generalResults.data.forEach(cocktail => {
            if (cocktail.id !== cocktailId) {
              allPotentialMatches.set(cocktail.id, cocktail);
            }
          });
        } catch (error) {
          // General search failed, continue with what we have
        }
      }
      
      // Fetch full details for top candidates to get ingredient data
      // Limit to top 50 candidates to avoid too many API calls
      const candidateIds = Array.from(allPotentialMatches.keys()).slice(0, 50);
      
      const detailedCocktails = new Map<number, any>();
      
      // Batch fetch details with parallel requests (groups of 10)
      const batchSize = 10;
      for (let i = 0; i < candidateIds.length; i += batchSize) {
        const batch = candidateIds.slice(i, i + batchSize);
        const detailPromises = batch.map(id => 
          this.getCocktailRecipe(id).catch(err => {
            return null;
          })
        );
        
        const results = await Promise.all(detailPromises);
        results.forEach((cocktail, idx) => {
          if (cocktail) {
            detailedCocktails.set(batch[idx], cocktail);
          }
        });
      }
      
      // Calculate similarity scores using detailed cocktail data
      const similarCocktails: SimilarCocktail[] = Array.from(detailedCocktails.values())
        .map(cocktail => {
          // Extract ingredients from full cocktail details
          const cocktailIngredients = (cocktail.short_ingredients || cocktail.ingredients)?.map((ing: any) => {
            const name = ing.ingredient?.name || ing.name || 'unknown';
            return name.toLowerCase();
          }) || [];
          
          const similarity = this.calculateSimilarity(baseIngredients, cocktailIngredients);
          const reasons = this.getSimilarityReasons(baseCocktail, cocktail);
          
          return {
            cocktail,
            similarity_score: similarity,
            similarity_reasons: reasons,
          };
        })
        .sort((a, b) => (b.similarity_score || 0) - (a.similarity_score || 0));
      
      // Filter and limit results (permissive threshold to allow diverse recommendations)
      const filtered = similarCocktails
        .filter(item => (item.similarity_score || 0) > 0.15) // Meaningful similarity threshold
        .slice(0, limit);

      return filtered;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check inventory status for given ingredients
   */
  async checkInventory(params: InventoryCheckParams = {}): Promise<InventoryStatus> {
    try {
      // Get user's bar inventory
      const barId = this.config.barId || '1';
      const response: AxiosResponse<{ data: BarIngredient[] }> = await this.client.get(
        `/api/bars/${barId}/ingredients`
      );

      const availableIngredients = response.data.data;
      const availableNames = availableIngredients.map(bar => bar.ingredient.name.toLowerCase());

      // If specific ingredients requested, filter for those
      let missingIngredients: any[] = [];
      if (params.ingredient_names && params.ingredient_names.length > 0) {
        const requestedIngredients = params.ingredient_names.map(name => name.toLowerCase());
        missingIngredients = requestedIngredients
          .filter(name => !availableNames.includes(name))
          .map(name => ({ name, id: 0, slug: name })); // Simplified structure
      }

      // Find cocktails that can be made with available ingredients
      const canMakeResults = await this.searchCocktails({ can_make: true, limit: 100 });
      const canMakeCocktails = canMakeResults.data.map(c => c.id);

      return {
        available_ingredients: availableIngredients,
        missing_ingredients: missingIngredients as any[], // Simplified structure for missing ingredients
        can_make_cocktails: canMakeCocktails,
      };
    } catch (error) {
      // Return empty inventory if bar doesn't exist or other error
      return {
        available_ingredients: [],
        missing_ingredients: (params.ingredient_names?.map(name => ({ 
          id: 0, 
          name, 
          slug: name.toLowerCase(),
          images: [],
          cocktail_ingredient_substitutes: [],
          pivot: {
            id: 0,
            cocktail_id: 0,
            ingredient_id: 0,
            amount: 0,
            units: 'ml',
            optional: false,
            sort: 0
          }
        })) || []) as any[],
        can_make_cocktails: [],
      };
    }
  }

  /**
   * Generate shopping list for given cocktails
   */
  async generateShoppingList(params: ShoppingListParams): Promise<ShoppingList> {
    try {
      const cocktails = await Promise.all(
        params.cocktail_ids.map(id => this.getCocktailRecipe(id))
      );

      // Get current inventory
      const inventory = await this.checkInventory();
      const availableIngredients = inventory.available_ingredients.map(
        bar => bar.ingredient.name.toLowerCase()
      );

      // Collect all required ingredients
      const requiredIngredients = new Map<string, {
        ingredient: any;
        totalAmount: number;
        units: string;
        cocktails: number[];
      }>();

      cocktails.forEach(cocktail => {
        cocktail.ingredients?.forEach(ingredient => {
          const name = ingredient.name.toLowerCase();
          if (!availableIngredients.includes(name)) {
            const key = ingredient.id.toString();
            const existing = requiredIngredients.get(key);
            
            if (existing) {
              existing.totalAmount += ingredient.pivot.amount || 0;
              existing.cocktails.push(cocktail.id);
            } else {
              requiredIngredients.set(key, {
                ingredient: ingredient,
                totalAmount: ingredient.pivot.amount || 0,
                units: ingredient.pivot.units || 'ml',
                cocktails: [cocktail.id],
              });
            }
          }
        });
      });

      // Convert to shopping list format
      const items = Array.from(requiredIngredients.values()).map(item => ({
        ingredient: item.ingredient,
        needed_amount: item.totalAmount,
        units: item.units,
        cocktails_requiring: item.cocktails,
        estimated_price: undefined, // Could be calculated if price data available
      }));

      return {
        items,
        cocktails_count: cocktails.length,
        total_estimated_cost: undefined,
      };
    } catch (error) {
      console.error('Error generating shopping list:', error);
      throw error;
    }
  }

  /**
   * Search for cocktails by name with fuzzy matching
   */
  async findCocktailByName(name: string): Promise<CocktailSearchResult> {
    // Try exact match first
    let results = await this.searchCocktails({ query: name, limit: 5 });
    
    // If no exact match, try partial matching with different strategies
    if (results.data.length === 0) {
      // Try with partial name
      const words = name.split(' ');
      if (words.length > 1) {
        // Try first word only
        results = await this.searchCocktails({ query: words[0], limit: 5 });
      }
      
      // If still no results, try searching by ingredient (user might be asking about ingredient-based cocktails)
      if (results.data.length === 0) {
        results = await this.searchCocktails({ ingredient: name, limit: 5 });
      }
    }
    
    return results;
  }

  /**
   * Get user's cocktail collections
   */
  async getCollections(): Promise<CocktailCollection[]> {
    try {
      const response: AxiosResponse<{ data: CocktailCollection[] }> = await this.client.get(
        '/api/collections?include=cocktails'
      );
      
      return response.data.data || [];
    } catch (error) {
      return [];
    }
  }

  // Helper methods
  private extractBaseSpirit(ingredients: string[]): string | null {
    const spiritPatterns = [
      { pattern: /(gin|juniper)/i, spirit: 'gin' },
      { pattern: /(whiskey|whisky|bourbon|rye|scotch)/i, spirit: 'whiskey' },
      { pattern: /(vodka)/i, spirit: 'vodka' },
      { pattern: /(rum|rhum)/i, spirit: 'rum' },
      { pattern: /(tequila|mezcal)/i, spirit: 'tequila' },
      { pattern: /(brandy|cognac|armagnac)/i, spirit: 'brandy' },
    ];

    for (const ingredient of ingredients) {
      for (const { pattern, spirit } of spiritPatterns) {
        if (pattern.test(ingredient)) {
          return spirit;
        }
      }
    }
    return null;
  }

  private calculateSimilarity(ingredients1: string[], ingredients2: string[]): number {
    if (ingredients1.length === 0 || ingredients2.length === 0) return 0;
    
    const set1 = new Set(ingredients1.map(ing => this.normalizeIngredientName(ing)));
    const set2 = new Set(ingredients2.map(ing => this.normalizeIngredientName(ing)));
    
    // Calculate basic Jaccard similarity
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    const basicSimilarity = union.size > 0 ? intersection.size / union.size : 0;
    
    // Boost score for shared base spirits (more important)
    const spirits1 = ingredients1.filter(ing => this.isBaseSpirit(ing));
    const spirits2 = ingredients2.filter(ing => this.isBaseSpirit(ing));
    const sharedSpirits = spirits1.filter(spirit => 
      spirits2.some(s => this.normalizeIngredientName(spirit) === this.normalizeIngredientName(s))
    );
    const spiritBonus = sharedSpirits.length > 0 ? 0.25 : 0;
    
    // Boost score for shared key modifiers (vermouth, bitters, etc.)
    const modifiers1 = ingredients1.filter(ing => this.isKeyModifier(ing));
    const modifiers2 = ingredients2.filter(ing => this.isKeyModifier(ing));
    const sharedModifiers = modifiers1.filter(mod => 
      modifiers2.some(m => this.normalizeIngredientName(mod) === this.normalizeIngredientName(m))
    );
    const modifierBonus = sharedModifiers.length * 0.15;
    
    // Additional bonus for matching multiple ingredients
    const ingredientCountBonus = intersection.size >= 2 ? 0.1 : 0;
    
    return Math.min(1.0, basicSimilarity + spiritBonus + modifierBonus + ingredientCountBonus);
  }
  
  private normalizeIngredientName(ingredient: string): string {
    return ingredient.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/,.*$/, '') // Remove everything after comma
      .replace(/\(.*\)/, '') // Remove parenthetical content
      .trim();
  }
  
  private isBaseSpirit(ingredient: string): boolean {
    const normalized = this.normalizeIngredientName(ingredient);
    const spirits = ['gin', 'vodka', 'rum', 'whiskey', 'whisky', 'bourbon', 'rye', 'scotch', 
                   'tequila', 'mezcal', 'brandy', 'cognac', 'armagnac', 'pisco', 'cachaça'];
    return spirits.some(spirit => normalized.includes(spirit));
  }
  
  private isKeyModifier(ingredient: string): boolean {
    const normalized = this.normalizeIngredientName(ingredient);
    const modifiers = ['vermouth', 'campari', 'aperol', 'bitters', 'cointreau', 'triple sec', 
                      'chartreuse', 'benedictine', 'maraschino', 'creme', 'liqueur'];
    return modifiers.some(modifier => normalized.includes(modifier));
  }

  private getSimilarityReasons(cocktail1: DetailedRecipe, cocktail2: any): string[] {
    const reasons: string[] = [];

    // Compare base spirits - handle different ingredient structures
    const spirits1 = cocktail1.ingredients?.filter((ing: any) => {
      const name = ing.ingredient?.name || ing.name || '';
      return this.extractBaseSpirit([name]) !== null;
    }) || [];
    const spirits2 = cocktail2.short_ingredients?.filter((ing: any) => {
      const name = ing.ingredient?.name || ing.name || '';
      return this.extractBaseSpirit([name]) !== null;
    }) || [];

    if (spirits1.length > 0 && spirits2.length > 0) {
      const spirit1Item = spirits1[0] as any;
      const spirit2Item = spirits2[0] as any;
      const name1 = spirit1Item.ingredient?.name || spirit1Item.name || '';
      const name2 = spirit2Item.ingredient?.name || spirit2Item.name || '';
      const spirit1 = this.extractBaseSpirit([name1]);
      const spirit2 = this.extractBaseSpirit([name2]);
      if (spirit1 === spirit2) {
        reasons.push(`Same base spirit: ${spirit1}`);
      }
    }

    // Compare common ingredients - handle different ingredient structures
    const ingredients1 = cocktail1.ingredients?.map((ing: any) => {
      const name = ing.ingredient?.name || ing.name || 'unknown';
      return name.toLowerCase();
    }) || [];
    const ingredients2 = cocktail2.short_ingredients?.map((ing: any) => {
      const name = ing.ingredient?.name || ing.name || 'unknown';
      return name.toLowerCase();
    }) || [];
    const common = ingredients1.filter(ing => ingredients2.includes(ing));
    
    if (common.length > 0) {
      reasons.push(`Shared ingredients: ${common.slice(0, 3).join(', ')}`);
    }

    // Compare methods if available
    if (cocktail1.method?.name && cocktail2.method?.name) {
      if (cocktail1.method.name === cocktail2.method.name) {
        reasons.push(`Same preparation method: ${cocktail1.method.name}`);
      }
    }

    // Compare glass types if available
    if (cocktail1.glass?.name && cocktail2.glass?.name) {
      if (cocktail1.glass.name === cocktail2.glass.name) {
        reasons.push(`Same glass type: ${cocktail1.glass.name}`);
      }
    }

    return reasons;
  }
}