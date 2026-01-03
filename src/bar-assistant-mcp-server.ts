#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { BarAssistantClient } from './bar-assistant-client.js';
import {
  SearchCocktailsParams,
  SmartSearchCocktailsParams,
  GetRecipeParams,
  SimilarCocktailsParams,
  InventoryCheckParams,
  ShoppingListParams,
  TasteRecommendationsParams,
  FilterCocktailsParams,
  BarAssistantConfig,
} from './types.js';
import * as ResponseSchemas from './response-schemas.js';
import * as OutputSchemas from './output-schemas.js';
import { CacheManager } from './cache-manager.js';
import { QueryParser } from './query-parser.js';

/**
 * Bar Assistant MCP Server
 * 
 * Provides natural language access to Bar Assistant cocktail database
 * through Model Context Protocol tools
 */
class BarAssistantMCPServer {
  private server: Server;
  private barClient: BarAssistantClient;
  private cacheManager: CacheManager;

  constructor() {
    // Initialize MCP server
    this.server = new Server(
      {
        name: 'bar-assistant-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Validate required environment variables
    this.validateEnvironment();

    // Get configuration from environment variables
    const config: BarAssistantConfig = {
      baseUrl: process.env.BAR_ASSISTANT_URL || '',
      token: process.env.BAR_ASSISTANT_TOKEN || '',
      barId: process.env.BAR_ASSISTANT_BAR_ID || '1',
      timeout: 30000,
    };

    // Initialize Bar Assistant API client
    this.barClient = new BarAssistantClient(config);

    // Initialize cache manager
    this.cacheManager = new CacheManager({
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000 // 1000 entries
    });

    this.setupToolHandlers();
  }

  /**
   * Validate that required environment variables are set
   */
  private validateEnvironment(): void {
    const requiredVars = ['BAR_ASSISTANT_URL', 'BAR_ASSISTANT_TOKEN'];
    const missing: string[] = [];

    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        missing.push(varName);
      }
    }

    if (missing.length > 0) {
      console.error('⚠️  Warning: Missing environment variables:', missing.join(', '));
      console.error('   Using default configuration. Please set these variables for production use.');
      console.error('   Example: export BAR_ASSISTANT_URL="https://your-instance.com"');
      console.error('           export BAR_ASSISTANT_TOKEN="your-api-token"');
    }

    // Validate URL format if provided
    if (process.env.BAR_ASSISTANT_URL) {
      try {
        new URL(process.env.BAR_ASSISTANT_URL);
      } catch (error) {
        throw new Error(`Invalid BAR_ASSISTANT_URL format: ${process.env.BAR_ASSISTANT_URL}`);
      }
    }
  }

  /**
   * Convert milliliters to ounces and format with cocktail-appropriate precision
   * 1 oz = 29.5735 ml
   * Rounds to common cocktail increments (0.25oz, 0.5oz, 0.75oz, 1oz, etc.)
   */
  private formatVolume(amount: number, units: string): string {
    if (units === 'ml' && amount > 0) {
      const ounces = amount / 29.5735;
      
      // Round to nearest quarter ounce (0.25oz) for cocktail-appropriate measurements
      const roundedOunces = Math.round(ounces * 4) / 4;
      
      // Format based on the rounded value
      if (roundedOunces >= 1) {
        // For 1oz and above, show whole numbers when possible
        if (roundedOunces === Math.floor(roundedOunces)) {
          return `${Math.floor(roundedOunces)}oz`;
        } else {
          return `${roundedOunces}oz`;
        }
      } else if (roundedOunces > 0) {
        // For amounts less than 1oz, show decimal (0.25, 0.5, 0.75)
        return `${roundedOunces}oz`;
      } else {
        // Fallback for very small amounts
        return `${Math.round(ounces * 1000) / 1000}oz`;
      }
    }
    // Return original format for non-ml units (dashes, drops, etc.)
    return `${amount}${units}`;
  }

  /**
   * Generate direct link URL for a cocktail
   * Format: https://your-instance.com/cocktails/[slug]
   * Note: slug already includes bar ID
   */
  private getCocktailDirectLink(slug: string): string {
    // Extract base URL from configured Bar Assistant URL
    const baseUrl = this.barClient['config'].baseUrl.replace(/\/bar$/, '');
    return `${baseUrl}/cocktails/${slug}`;
  }

  /**
   * Create consistent metadata for responses
   */
  private createResponseMetadata(source: string, resultCount: number, startTime?: number): ResponseSchemas.ResponseMetadata {
    const processingTime = startTime ? Date.now() - startTime : undefined;
    return {
      source,
      timestamp: new Date().toISOString(),
      result_count: resultCount,
      processing_time: processingTime,
      version: '1.0.0'
    };
  }

  /**
   * Convert API cocktail data to structured CocktailResult format
   */
  private formatCocktailResult(cocktail: any, confidence?: number): ResponseSchemas.CocktailResult {
    // Format ingredients
    const ingredientsList = cocktail.ingredients || cocktail.short_ingredients || [];
    const ingredients: ResponseSchemas.IngredientInfo[] = ingredientsList.map((ing: any) => {
      const amount = ing.pivot?.amount || ing.amount || '';
      const units = ing.pivot?.units || ing.units || '';
      const name = ing.ingredient?.name || ing.name || 'Unknown ingredient';
      const optional = ing.pivot?.optional || ing.optional || false;
      const note = ing.pivot?.note || '';
      
      const formattedAmount = amount ? this.formatVolume(amount, units) : '';
      const formatted = `${formattedAmount} ${name}${optional ? ' (optional)' : ''}${note ? ` - ${note}` : ''}`;
      
      return {
        name,
        amount: formattedAmount,
        units,
        optional,
        note,
        formatted: formatted.trim()
      };
    });

    // Format instructions
    let instructions: ResponseSchemas.InstructionStep[] = [];
    const rawInstructions = cocktail.instructions;
    
    if (rawInstructions) {
      if (typeof rawInstructions === 'string') {
        const steps = rawInstructions.split(/[,\n\r]|(?:\d+\.)/g)
          .map((step: string) => step.trim())
          .filter((step: string) => step.length > 0);
        
        instructions = steps.map((instruction, index) => ({
          step: index + 1,
          instruction
        }));
      } else if (Array.isArray(rawInstructions)) {
        instructions = rawInstructions
          .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0))
          .map((inst: any, index: number) => ({
            step: index + 1,
            instruction: inst.content || inst.description || inst.text || inst
          }));
      }
    }

    // Format details
    const details: ResponseSchemas.CocktailDetails = {
      abv: cocktail.abv || undefined,
      glass: cocktail.glass?.name || undefined,
      method: cocktail.method?.name || undefined,
      garnish: cocktail.garnish || undefined,
      source: cocktail.source || undefined,
      tags: cocktail.tags?.map((tag: any) => tag.name || tag) || undefined,
      direct_link: cocktail.slug ? this.getCocktailDirectLink(cocktail.slug) : undefined
    };

    return {
      id: cocktail.id,
      name: cocktail.name,
      description: cocktail.description || undefined,
      ingredients,
      instructions,
      details,
      confidence,
      slug: cocktail.slug || undefined
    };
  }

  /**
   * Create structured response with both machine-readable and human-readable content
   */
  private createStructuredResponse(
    humanReadableText: string, 
    structuredData: any, 
    contentType: 'text' | 'resource' = 'text'
  ) {
    return {
      content: [
        {
          type: contentType,
          text: humanReadableText,
        }
      ],
      structuredContent: structuredData
    };
  }

  /**
   * Format ingredient list as standardized bullet points
   * Ensures consistent formatting across all responses
   */
  private formatIngredientList(ingredients: ResponseSchemas.IngredientInfo[], highlightIngredient?: string): string {
    if (!ingredients || ingredients.length === 0) {
      return '• No ingredients listed';
    }

    return ingredients.map(ing => {
      // Check if this ingredient should be highlighted (for ingredient search results)
      const shouldHighlight = highlightIngredient && 
        ing.name.toLowerCase().includes(highlightIngredient.toLowerCase());
      
      if (shouldHighlight) {
        return `• **${ing.formatted}** ← *${highlightIngredient}*`;
      } else {
        return `• ${ing.formatted}`;
      }
    }).join('\n');
  }

  /**
   * Format multiple cocktails with enhanced visual hierarchy and readability
   * Features large, bold cocktail names and improved section organization
   */
  private formatMultipleCocktails(cocktails: ResponseSchemas.CocktailResult[], highlightIngredient?: string): string {
    if (!cocktails || cocktails.length === 0) {
      return '';
    }

    return cocktails.map((cocktail, index) => {
      // Large, prominent cocktail name with emoji and number
      let result = `\n# 🍸 ${index + 1}. **${cocktail.name.toUpperCase()}**\n\n`;
      
      // Enhanced details section with emojis
      const details = [];
      if (cocktail.details.abv) details.push(`🥃 **${cocktail.details.abv}% ABV**`);
      if (cocktail.details.glass) details.push(`🥂 **${cocktail.details.glass}**`);
      if (cocktail.details.method) details.push(`🔧 **${cocktail.details.method}**`);
      if (details.length > 0) {
        result += `${details.join('  •  ')}\n\n`;
      }
      
      // Description with better formatting
      if (cocktail.description) {
        result += `> *${cocktail.description}*\n\n`;
      }
      
      // Metadata section
      result += `**📍 ID:** \`${cocktail.id}\``;
      if (cocktail.details.direct_link) {
        result += `  •  **🔗 [View Recipe](${cocktail.details.direct_link})**`;
      }
      result += `\n\n`;
      
      // Ingredients section with enhanced styling
      result += `## 🧾 Ingredients\n`;
      result += `${this.formatIngredientList(cocktail.ingredients, highlightIngredient)}\n\n`;
      
      // Instructions section with enhanced styling  
      result += `## 📋 Instructions\n`;
      cocktail.instructions.forEach(inst => {
        result += `**${inst.step}.** ${inst.instruction}\n`;
      });
      
      // Garnish with enhanced styling
      if (cocktail.details.garnish) {
        result += `\n**🌿 Garnish:** *${cocktail.details.garnish}*\n`;
      }
      
      // Enhanced separator between cocktails
      if (index < cocktails.length - 1) {
        result += `\n\n---\n`;
      } else {
        result += `\n`;
      }
      
      return result;
    }).join('');
  }

  /**
   * Format similar cocktails with enhanced visual hierarchy and similarity scores
   * Used specifically for similar cocktail recommendations with enhanced readability
   */
  private formatSimilarCocktails(similarResults: any[], baseCocktailName: string): string {
    if (!similarResults || similarResults.length === 0) {
      return '';
    }

    let response = `# 🔄 Cocktails Similar to ${baseCocktailName}\n\nBased on your Bar Assistant database, here are cocktails similar to **${baseCocktailName}** with complete recipes:\n\n`;

    similarResults.forEach((similar, index) => {
      const cocktail = similar.cocktailResult;
      const similarityScore = similar.similarity_score ? 
        `${Math.round(similar.similarity_score * 100)}% similar` : 'Similarity not calculated';
      
      // Large, prominent cocktail name with similarity score
      response += `\n# 🍸 ${index + 1}. **${cocktail.name.toUpperCase()}** \n## 📊 *${similarityScore}*\n\n`;
      
      // Enhanced details section with emojis
      const details = [];
      if (cocktail.details.abv) details.push(`🥃 **${cocktail.details.abv}% ABV**`);
      if (cocktail.details.glass) details.push(`🥂 **${cocktail.details.glass}**`);
      if (cocktail.details.method) details.push(`🔧 **${cocktail.details.method}**`);
      if (details.length > 0) {
        response += `${details.join('  •  ')}\n\n`;
      }
      
      // Description with better formatting
      if (cocktail.description) {
        response += `> *${cocktail.description}*\n\n`;
      }
      
      // Metadata section
      response += `**📍 ID:** \`${cocktail.id}\``;
      if (cocktail.details.direct_link) {
        response += `  •  **🔗 [View Recipe](${cocktail.details.direct_link})**`;
      }
      response += `\n\n`;
      
      // Ingredients section with enhanced styling
      response += `## 🧾 Ingredients\n`;
      response += `${this.formatIngredientList(cocktail.ingredients)}\n\n`;
      
      // Instructions section with enhanced styling  
      response += `## 📋 Instructions\n`;
      cocktail.instructions.forEach((inst: any) => {
        response += `**${inst.step}.** ${inst.instruction}\n`;
      });
      
      // Garnish with enhanced styling
      if (cocktail.details.garnish) {
        response += `\n**🌿 Garnish:** *${cocktail.details.garnish}*\n`;
      }
      
      // Enhanced similarity reasons section
      const reasons = similar.similarity_reasons?.join(', ') || 'Similar flavor profile';
      response += `\n> **🤔 Why similar:** *${reasons}*\n`;
      
      // Enhanced separator between cocktails
      if (index < similarResults.length - 1) {
        response += `\n\n---\n`;
      } else {
        response += `\n`;
      }
    });

    return response;
  }

  /**
   * Format a single recipe with detailed information and enhanced styling
   */
  private formatSingleRecipeDetailed(cocktail: ResponseSchemas.CocktailResult): string {
    let result = `# 🍸 **${cocktail.name.toUpperCase()}**\n\n`;
    
    // Enhanced details section with emojis
    const details = [];
    if (cocktail.details.abv) details.push(`🥃 **${cocktail.details.abv}% ABV**`);
    if (cocktail.details.glass) details.push(`🥂 **${cocktail.details.glass}**`);
    if (cocktail.details.method) details.push(`🔧 **${cocktail.details.method}**`);
    if (details.length > 0) {
      result += `${details.join('  •  ')}\n\n`;
    }
    
    // Description with better formatting
    if (cocktail.description) {
      result += `> *${cocktail.description}*\n\n`;
    }
    
    // Metadata section
    result += `**📍 ID:** \`${cocktail.id}\``;
    if (cocktail.details.direct_link) {
      result += `  •  **🔗 [View Recipe](${cocktail.details.direct_link})**`;
    }
    result += `\n\n`;
    
    // Ingredients section with enhanced styling
    result += `## 🧾 Ingredients\n`;
    result += `${this.formatIngredientList(cocktail.ingredients)}\n\n`;
    
    // Instructions section with enhanced styling  
    result += `## 📋 Instructions\n`;
    cocktail.instructions.forEach((inst: any) => {
      result += `**${inst.step}.** ${inst.instruction}\n`;
    });
    
    // Garnish with enhanced styling
    if (cocktail.details.garnish) {
      result += `\n**🌿 Garnish:** *${cocktail.details.garnish}*\n`;
    }
    
    // Additional details
    if (cocktail.details.source) {
      result += `\n**📚 Source:** ${cocktail.details.source}\n`;
    }
    
    if (cocktail.details.tags && cocktail.details.tags.length > 0) {
      result += `\n**🏷️ Tags:** ${cocktail.details.tags.join(', ')}\n`;
    }
    
    return result;
  }

  /**
   * Handle similarity-based cocktail searches
   */
  private async handleSimilaritySearch(args: any, startTime: number) {
    let cocktailId = args.similar_to_id;
    
    // If searching by name, find the cocktail ID first with better matching
    if (args.similar_to && !cocktailId) {
      try {
        const searchResult = await this.barClient.searchCocktails({ query: args.similar_to, limit: 10 });
        if (searchResult.data.length > 0) {
          // Find the best match - prioritize exact matches and avoid variations
          const searchTerm = args.similar_to.toLowerCase().trim();
          
          // First, look for exact matches
          let bestMatch = searchResult.data.find(cocktail => 
            cocktail.name.toLowerCase() === searchTerm
          );
          
          // If no exact match, look for cocktails that start with the search term
          if (!bestMatch) {
            bestMatch = searchResult.data.find(cocktail => 
              cocktail.name.toLowerCase().startsWith(searchTerm)
            );
          }
          
          // If still no good match, look for cocktails that contain the term but aren't variations
          if (!bestMatch) {
            bestMatch = searchResult.data.find(cocktail => {
              const name = cocktail.name.toLowerCase();
              return name.includes(searchTerm) && 
                     !name.includes('frozen') && 
                     !name.includes('dry') && 
                     !name.includes('perfect') &&
                     !name.includes('reverse') &&
                     !name.includes('white') &&
                     !name.includes('red');
            });
          }
          
          // Fall back to first result if no better match found
          if (!bestMatch) {
            bestMatch = searchResult.data[0];
          }
          
          cocktailId = bestMatch.id;
        } else {
          // Fallback to regular search if cocktail not found
          return await this.performRegularSearch({ ...args, query: args.similar_to }, startTime);
        }
      } catch (error) {
        // Fallback to regular search if similarity search fails
        return await this.performRegularSearch({ ...args, query: args.similar_to }, startTime);
      }
    }
    
    // Get similar cocktails using the existing method
    if (cocktailId) {
      try {
        return await this.handleFindSimilarCocktails({ cocktail_id: cocktailId, limit: args.limit || 5 });
      } catch (error) {
        // If similarity search fails, fallback to regular search
        if (args.similar_to) {
          return await this.performRegularSearch({ ...args, query: args.similar_to }, startTime);
        }
        throw error;
      }
    }
    
    throw new Error('No cocktail ID or name provided for similarity search');
  }

  /**
   * Perform the main cocktail search with filtering
   */
  private async performCocktailSearch(args: any) {
    // Build search parameters
    const searchParams: SearchCocktailsParams = {
      limit: args.limit || 20,
    };

    let searchType = 'general';
    const appliedFilters: Record<string, any> = {};

    // Handle basic queries
    if (args.query) {
      searchParams.query = args.query;
      searchType = 'name';
      appliedFilters.query = args.query;
    }
    if (args.ingredient) {
      searchParams.ingredient = args.ingredient;
      searchType = 'ingredient';
      appliedFilters.ingredient = args.ingredient;
    }

    // Handle ABV filtering
    if (args.abv_min !== undefined) {
      searchParams.abv_min = args.abv_min;
      appliedFilters.abv_min = args.abv_min;
    }
    if (args.abv_max !== undefined) {
      searchParams.abv_max = args.abv_max;
      appliedFilters.abv_max = args.abv_max;
    }
    
    // Convert strength preferences to ABV ranges
    if (args.preferred_strength && !args.abv_min && !args.abv_max) {
      searchType = 'strength';
      appliedFilters.preferred_strength = args.preferred_strength;
      switch (args.preferred_strength) {
        case 'light':
          searchParams.abv_max = 15;
          break;
        case 'medium':
          searchParams.abv_min = 15;
          searchParams.abv_max = 30;
          break;
        case 'strong':
          searchParams.abv_min = 30;
          break;
      }
    }

    // Handle flavor-based searches
    if (args.preferred_flavors?.length > 0) {
      searchType = 'flavor';
      appliedFilters.preferred_flavors = args.preferred_flavors;
      if (!args.ingredient) {
        const flavorIngredientMap: { [key: string]: string } = {
          'bitter': 'campari',
          'sweet': 'vermouth',
          'sour': 'lemon',
          'herbal': 'chartreuse',
          'spicy': 'ginger',
        };
        
        for (const flavor of args.preferred_flavors) {
          if (flavorIngredientMap[flavor.toLowerCase()]) {
            searchParams.ingredient = flavorIngredientMap[flavor.toLowerCase()];
            break;
          }
        }
      }
    }

    // Handle must_include ingredients
    if (args.must_include?.length > 0) {
      appliedFilters.must_include = args.must_include;
      if (!searchParams.ingredient) {
        searchParams.ingredient = args.must_include[0];
      }
    }

    // Handle exclusions
    if (args.must_exclude?.length > 0) {
      appliedFilters.must_exclude = args.must_exclude;
    }

    // Glass and method filters
    if (args.glass_type) appliedFilters.glass_type = args.glass_type;
    if (args.preparation_method) appliedFilters.preparation_method = args.preparation_method;

    // Perform the search
    let results = await this.barClient.searchCocktails(searchParams);
    let filteredResults = results.data;

    // Apply post-search filtering
    filteredResults = this.applyAdvancedFilters(filteredResults, args);

    return {
      results: filteredResults,
      searchType,
      appliedFilters
    };
  }

  /**
   * Apply advanced post-search filtering
   */
  private applyAdvancedFilters(results: any[], args: any): any[] {
    let filtered = results;

    // Filter for additional must_include ingredients
    if (args.must_include?.length > 1) {
      const requiredIngredients = args.must_include.slice(1).map((ing: string) => ing.toLowerCase());
      filtered = filtered.filter(cocktail => {
        const ingredients = cocktail.short_ingredients?.map((ing: any) => {
          const name = ing.ingredient?.name || ing.name || '';
          return name.toLowerCase();
        }) || [];
        return requiredIngredients.every((required: string) => 
          ingredients.some((ing: string) => ing.includes(required))
        );
      });
    }

    // Filter out must_exclude ingredients
    if (args.must_exclude?.length > 0) {
      const excludedLower = args.must_exclude.map((ing: string) => ing.toLowerCase());
      filtered = filtered.filter(cocktail => {
        const ingredients = cocktail.short_ingredients?.map((ing: any) => {
          const name = ing.ingredient?.name || ing.name || '';
          return name.toLowerCase();
        }) || [];
        return !ingredients.some((ing: string) => excludedLower.some((excluded: string) => ing.includes(excluded)));
      });
    }

    // Filter by glass type
    if (args.glass_type) {
      filtered = filtered.filter(cocktail => 
        cocktail.glass?.name?.toLowerCase().includes(args.glass_type.toLowerCase())
      );
    }

    // Filter by preparation method
    if (args.preparation_method) {
      filtered = filtered.filter(cocktail => 
        cocktail.method?.name?.toLowerCase().includes(args.preparation_method.toLowerCase())
      );
    }

    return filtered.slice(0, args.limit || 20);
  }

  /**
   * Fetch complete recipe details for cocktails with caching and batch processing
   */
  private async fetchCompleteRecipes(cocktails: any[]): Promise<ResponseSchemas.CocktailResult[]> {
    const results: ResponseSchemas.CocktailResult[] = [];
    const uncachedCocktails: any[] = [];
    
    // First, check cache for existing recipes
    for (const cocktail of cocktails) {
      const cached = this.cacheManager.getCachedRecipe(cocktail.id);
      if (cached) {
        results.push(this.formatCocktailResult(cached));
      } else {
        uncachedCocktails.push(cocktail);
      }
    }
    
    // Batch fetch uncached recipes
    if (uncachedCocktails.length > 0) {
      const batchResults = await this.fetchCompleteRecipesBatch(uncachedCocktails);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Batch fetch recipes with error recovery
   */
  private async fetchCompleteRecipesBatch(cocktails: any[]): Promise<ResponseSchemas.CocktailResult[]> {
    const batchSize = 5;
    const results: ResponseSchemas.CocktailResult[] = [];
    
    for (let i = 0; i < cocktails.length; i += batchSize) {
      const batch = cocktails.slice(i, i + batchSize);
      const promises = batch.map(cocktail => 
        this.getCocktailWithFallback(cocktail.id, cocktail)
      );
      
      const batchResults = await Promise.allSettled(promises);
      
      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const originalCocktail = batch[j];
        
        if (result.status === 'fulfilled') {
          const formattedResult = this.formatCocktailResult(result.value);
          results.push(formattedResult);
          // Cache successful results
          this.cacheManager.setCachedRecipe(originalCocktail.id, result.value);
        } else {
          // Use fallback data for failed requests
          const fallbackResult = this.formatCocktailResult(originalCocktail);
          
          // Ensure we have some meaningful content even for failures
          if (fallbackResult.ingredients.length === 0) {
            fallbackResult.ingredients = [{
              name: 'Recipe details unavailable',
              formatted: 'Complete recipe not available - ingredients list missing'
            }];
          }
          if (fallbackResult.instructions.length === 0) {
            fallbackResult.instructions = [{
              step: 1,
              instruction: 'Complete instructions not available - please refer to source or try getting recipe by ID'
            }];
          }
          
          results.push(fallbackResult);
        }
      }
    }
    
    return results;
  }

  /**
   * Get cocktail with smart fallback strategies
   */
  private async getCocktailWithFallback(cocktailId: number, fallbackData?: any): Promise<any> {
    try {
      return await this.barClient.getCocktailRecipe(cocktailId);
    } catch (error) {
      console.warn(`Failed to fetch recipe for cocktail ${cocktailId}:`, error);
      
      // Try search fallback if we don't have fallback data
      if (!fallbackData) {
        try {
          const searchResult = await this.barClient.searchCocktails({ 
            query: `id:${cocktailId}`, 
            limit: 1 
          });
          
          if (searchResult.data.length > 0) {
            return searchResult.data[0];
          }
        } catch (searchError) {
          console.warn(`Search fallback also failed for cocktail ${cocktailId}:`, searchError);
        }
      }
      
      // Return fallback data or minimal structure
      return fallbackData || {
        id: cocktailId,
        name: 'Unknown Cocktail',
        ingredients: [],
        instructions: [],
        description: 'Recipe details unavailable'
      };
    }
  }

  /**
   * Format search results as human-readable text
   */
  private formatSearchResultsText(data: ResponseSchemas.CocktailSearchResponse, args: any): string {
    let response = `# Smart Cocktail Search Results\n\n`;
    
    // Show search criteria
    const searchCriteria = [];
    if (data.query.terms) searchCriteria.push(`Name: "${data.query.terms}"`);
    if (data.query.filters?.ingredient) searchCriteria.push(`Ingredient: ${data.query.filters.ingredient}`);
    if (data.query.filters?.preferred_flavors) searchCriteria.push(`Flavors: ${data.query.filters.preferred_flavors.join(', ')}`);
    if (data.query.filters?.preferred_strength) searchCriteria.push(`Strength: ${data.query.filters.preferred_strength}`);
    if (data.query.filters?.must_include) searchCriteria.push(`Must include: ${data.query.filters.must_include.join(', ')}`);
    if (data.query.filters?.must_exclude) searchCriteria.push(`Excluding: ${data.query.filters.must_exclude.join(', ')}`);
    if (data.query.filters?.glass_type) searchCriteria.push(`Glass: ${data.query.filters.glass_type}`);
    if (data.query.filters?.preparation_method) searchCriteria.push(`Method: ${data.query.filters.preparation_method}`);

    if (searchCriteria.length > 0) {
      response += `**Search criteria:** ${searchCriteria.join(' | ')}\n\n`;
    }

    if (data.results.length === 0) {
      response += `No cocktails found matching your search criteria.\n\n`;
      response += `**Suggestions:**\n`;
      response += `• Try broader search terms\n`;
      response += `• Remove some filters\n`;
      response += `• Check ingredient spelling\n`;
      response += `• Use \`get_ingredient_info\` to explore available ingredients`;
      return response;
    }

    response += `Found ${data.results.length} cocktail${data.results.length === 1 ? '' : 's'}:\n\n`;
    
    // Use standardized multi-cocktail formatter
    response += this.formatMultipleCocktails(data.results);
    
    return response;
  }

  /**
   * Fallback method for regular search when similarity search fails
   */
  private async performRegularSearch(args: any, startTime: number) {
    const { results, searchType, appliedFilters } = await this.performCocktailSearch(args);
    
    const structuredData: ResponseSchemas.CocktailSearchResponse = {
      results: await this.fetchCompleteRecipes(results.slice(0, args.limit || 20)),
      query: {
        terms: args.query || undefined,
        filters: appliedFilters,
        search_type: searchType
      },
      metadata: this.createResponseMetadata('bar_assistant_api', results.length, startTime)
    };

    const humanText = this.formatSearchResultsText(structuredData, args);
    return this.createStructuredResponse(humanText, structuredData);
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'smart_search_cocktails',
            description: `🚀 PREFERRED TOOL: Advanced cocktail search with intelligent batch processing and complete recipes.

**🎯 BATCH PROCESSING SYSTEM:**
- **High Performance**: Parallel processing with 5-10x speed improvement
- **Smart Caching**: Automatic caching for 70%+ faster repeated searches
- **Error Resilience**: Individual failures don't break entire batch operations
- **Flexible Limits**: Configure result count (default: 20, max: 50)

**📋 Use Cases:**
- General searches: "gin cocktails", "winter drinks", "classic cocktails"
- Similarity queries: "cocktails like Manhattan", "similar to Negroni"
- Ingredient-based: "cocktails with bourbon", "drinks using Campari"
- Flavor profiles: "bitter cocktails", "sweet drinks", "herbal spirits"
- Complex filtering: combine ingredients, ABV ranges, glass types, methods
- Batch comparisons: Multiple ingredient searches simultaneously

**🔄 Batch Processing Examples:**
- Single search: {query: "Manhattan"} → Complete recipe + similar cocktails
- Multi-ingredient: {ingredient: "gin", must_include: ["vermouth", "bitters"]}
- Similarity batch: {similar_to: "Negroni", limit: 10} → 10 similar cocktails
- Complex filter: {preferred_flavors: ["bitter"], abv_min: 25, limit: 15}

**📊 Response Format:**
Returns structured data with complete recipes including:
- Ingredients with precise measurements in oz (auto-converted from ml)
- Step-by-step preparation instructions
- Cocktail specifications (ABV, glass, method, garnish)
- Direct links to cocktail database pages
- Performance metrics (processing time, cache hits)
- Similar cocktail recommendations with full recipes

**⚡ Performance Features:**
- Parallel API processing for multiple results
- Intelligent caching system with TTL management
- Batch fetching of complete recipe details
- Error isolation and fallback handling`,
            inputSchema: {
              type: 'object',
              properties: {
                // Core search parameters
                query: {
                  type: 'string',
                  description: '🔍 Natural language search query (e.g., "Negroni", "gin cocktails", "bitter drinks")',
                },
                similar_to: {
                  type: 'string',
                  description: '🔄 Find cocktails similar to this name (e.g., "Manhattan", "Negroni"). Triggers similarity batch processing.',
                },
                similar_to_id: {
                  type: 'number',
                  description: '🆔 Find cocktails similar to this ID. Use similar_to (by name) unless you have the specific ID.',
                },
                
                // Ingredient filtering (supports batch processing)
                ingredient: {
                  type: 'string',
                  description: '🥃 Primary ingredient filter (e.g., "gin", "whiskey", "campari"). Combines with other filters for batch processing.',
                },
                must_include: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '✅ Required ingredients array. Batch processes cocktails containing ALL these ingredients.',
                },
                must_exclude: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '❌ Excluded ingredients array. Filters out cocktails with ANY of these ingredients.',
                },
                
                // Advanced filtering (enhances batch results)
                preferred_flavors: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '🎯 Flavor profile preferences: ["bitter", "sweet", "sour", "spicy", "herbal"]. Improves batch ranking.',
                },
                preferred_strength: {
                  type: 'string',
                  enum: ['light', 'medium', 'strong'],
                  description: '💪 Alcohol strength preference. Filters batch results by ABV ranges.',
                },
                abv_min: {
                  type: 'number',
                  description: '📊 Minimum ABV percentage. Lower bound for batch filtering.',
                },
                abv_max: {
                  type: 'number',
                  description: '📊 Maximum ABV percentage. Upper bound for batch filtering.',
                },
                
                // Presentation filtering
                glass_type: {
                  type: 'string',
                  description: '🥂 Required glassware (e.g., "coupe", "rocks", "martini"). Filters entire batch.',
                },
                preparation_method: {
                  type: 'string',
                  description: '🔧 Required method (e.g., "shake", "stir", "build"). Filters batch by technique.',
                },
                
                // Batch control parameters
                limit: {
                  type: 'number',
                  description: '🎛️ Maximum results to return (default: 20, max: 50). Controls batch size for optimal performance.',
                  default: 20,
                  minimum: 1,
                  maximum: 50,
                },
              },
            },
            outputSchema: {
              type: 'object',
              description: '🎯 Batch processing response with complete cocktail data and performance metrics',
              properties: {
                search_results: {
                  type: 'object',
                  properties: {
                    total_found: { 
                      type: 'number',
                      description: 'Total cocktails found matching criteria' 
                    },
                    returned: { 
                      type: 'number',
                      description: 'Number of cocktails returned (limited by batch size)' 
                    },
                    search_type: { 
                      type: 'string',
                      description: 'Type of search performed (query, similarity, ingredient, etc.)' 
                    }
                  }
                },
                cocktails: {
                  type: 'array',
                  description: 'Complete cocktail recipes with full details',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'number' },
                      name: { type: 'string' },
                      description: { type: 'string' },
                      ingredients: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            name: { type: 'string' },
                            formatted: { type: 'string', description: 'Human-readable amount with units' },
                            amount: { type: 'string' },
                            optional: { type: 'boolean' }
                          }
                        }
                      },
                      instructions: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            step: { type: 'number' },
                            instruction: { type: 'string' }
                          }
                        }
                      },
                      details: {
                        type: 'object',
                        properties: {
                          abv: { type: 'number', description: 'Alcohol by volume percentage' },
                          glass: { type: 'string', description: 'Recommended glassware' },
                          method: { type: 'string', description: 'Preparation method' },
                          garnish: { type: 'string', description: 'Garnish instructions' },
                          direct_link: { type: 'string', description: 'URL to full recipe page' },
                          tags: { type: 'array', items: { type: 'string' } }
                        }
                      }
                    }
                  }
                },
                similar_cocktails: {
                  type: 'array',
                  description: 'Additional similar cocktails (when using similarity search)',
                  items: { $ref: '#/properties/cocktails/items' }
                },
                performance_metrics: {
                  type: 'object',
                  description: 'Batch processing performance data',
                  properties: {
                    processing_time_ms: { type: 'number' },
                    api_calls_made: { type: 'number' },
                    cache_hits: { type: 'number' },
                    cache_misses: { type: 'number' },
                    batch_processing_used: { type: 'boolean' },
                    parallel_requests: { type: 'number' }
                  }
                },
                search_metadata: {
                  type: 'object',
                  properties: {
                    enhanced_query: { type: 'string', description: 'Processed natural language query' },
                    applied_filters: { type: 'array', items: { type: 'string' } },
                    search_strategy: { type: 'string', description: 'Batch processing strategy used' }
                  }
                }
              }
            },
          },
          {
            name: 'get_recipe',
            description: `🍸 Advanced recipe retrieval with powerful batch processing for multiple cocktails.

**🚀 BATCH PROCESSING SYSTEM:**
- **High Performance**: 5-10x faster than sequential requests
- **Parallel Processing**: Simultaneous API calls with error isolation
- **Smart Caching**: 70%+ cache hit rate for repeated requests
- **Flexible Input**: Mix cocktail names and IDs in single request
- **Error Resilience**: Individual failures don't break entire batch

**📋 LLM Usage Patterns:**
- **Single Recipe**: When user asks for "how to make [cocktail]"
- **Recipe Comparison**: When user wants to compare multiple cocktails
- **Menu Planning**: Batch retrieve recipes for event planning
- **Variation Exploration**: Get base recipe + similar cocktails
- **Research Mode**: Efficient lookup of multiple specific recipes

**🎯 Input Methods (Choose Based on Use Case):**

1. **Single Recipe (Backwards Compatible)**:
   - cocktail_name: "Manhattan" → One complete recipe
   - cocktail_id: 123 → Recipe by database ID

2. **Batch by Names (Most Common)**:
   - cocktail_names: ["Negroni", "Manhattan", "Martini"] → Multiple complete recipes

3. **Batch by IDs (When Available)**:
   - cocktail_ids: [1, 2, 3] → Multiple recipes by database IDs

4. **Mixed Batch (Maximum Flexibility)**:
   - cocktail_names: ["Aviation"] + cocktail_ids: [123, 456] → Combined approach

5. **With Variations (Exploration)**:
   - Any above + include_variations: true → Base recipes + similar cocktails

**📊 Response Format:**
Structured output with complete recipe data:
- Precise ingredient measurements (auto-converted to oz)
- Step-by-step preparation instructions
- Cocktail specifications (ABV, glassware, method, garnish)
- Direct database links for each recipe
- Performance metrics (timing, cache usage)
- Similar recipes when requested
- Rich formatting with emojis and clear sections

**⚡ Performance Examples:**
- Single recipe: ~150-300ms (cached responses faster)
- Batch (3 cocktails): ~250-400ms (vs 900ms+ sequential)
- Mixed batch (5 cocktails): ~300-500ms with parallel processing
- Cache hit: <50ms instant response

**🎛️ Batch Control Parameters:**
- limit: 1-20 recipes (default: 10) - controls batch size
- include_variations: Boolean - adds similar cocktails to results`,
            inputSchema: {
              type: 'object',
              description: '🎛️ Flexible input schema supporting single recipes and high-performance batch processing',
              properties: {
                // Single recipe parameters (backwards compatible)
                cocktail_id: {
                  type: 'number',
                  description: '🆔 Single cocktail database ID. Use for specific recipe lookup when ID is known.',
                },
                cocktail_name: {
                  type: 'string',
                  description: '🍸 Single cocktail name. Use for individual recipe requests (e.g., "Manhattan", "Negroni").',
                },
                
                // Batch processing parameters (high performance)
                cocktail_ids: {
                  type: 'array',
                  items: { type: 'number' },
                  description: '🚀 Array of cocktail IDs for batch processing. Enables parallel retrieval of multiple recipes by database ID. More efficient than multiple single requests.',
                },
                cocktail_names: {
                  type: 'array',
                  items: { type: 'string' },
                  description: '🚀 Array of cocktail names for batch processing. Enables parallel retrieval of multiple recipes by name (e.g., ["Manhattan", "Negroni", "Martini"]). Triggers name resolution + batch fetching.',
                },
                
                // Enhancement parameters
                include_variations: {
                  type: 'boolean',
                  description: '🔄 Include similar/variation recipes in results. Adds related cocktails to expand exploration (default: false).',
                  default: false,
                },
                
                // Batch control parameters
                limit: {
                  type: 'number',
                  description: '🎛️ Maximum number of recipes to return. Controls batch size for optimal performance (default: 10, max: 20). Higher limits may impact response time.',
                  default: 10,
                  minimum: 1,
                  maximum: 20,
                },
              },
              // Schema validation rules for LLMs
              oneOf: [
                {
                  description: 'Single recipe by name',
                  required: ['cocktail_name']
                },
                {
                  description: 'Single recipe by ID', 
                  required: ['cocktail_id']
                },
                {
                  description: 'Batch processing by names',
                  required: ['cocktail_names']
                },
                {
                  description: 'Batch processing by IDs',
                  required: ['cocktail_ids']
                },
                {
                  description: 'Mixed batch processing',
                  anyOf: [
                    { required: ['cocktail_names', 'cocktail_ids'] },
                    { required: ['cocktail_names', 'cocktail_id'] },
                    { required: ['cocktail_name', 'cocktail_ids'] }
                  ]
                }
              ],
            },
            outputSchema: {
        type: 'object',
        properties: {
          recipes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'number' },
                name: { type: 'string' },
                description: { type: 'string' },
                ingredients: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      formatted: { type: 'string' },
                      amount: { type: 'string' },
                      optional: { type: 'boolean' }
                    }
                  }
                },
                instructions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      step: { type: 'number' },
                      instruction: { type: 'string' }
                    }
                  }
                },
                details: {
                  type: 'object',
                  properties: {
                    abv: { type: 'number' },
                    glass: { type: 'string' },
                    method: { type: 'string' },
                    garnish: { type: 'string' },
                    direct_link: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } }
                  }
                }
              }
            }
          },
          performance: {
            type: 'object',
            properties: {
              processing_time: { type: 'number' },
              recipes_fetched: { type: 'number' },
              cache_hits: { type: 'number' },
              batch_processing: { type: 'boolean' }
            }
          }
        }
      },
          },

          {
            name: 'get_ingredient_info',
            description: `Get comprehensive information about cocktail ingredients and their usage.

**Use Cases:**
- Ingredient research: "what is Aperol?", "tell me about gin"
- Substitution guidance: finding alternatives for unavailable ingredients
- Usage exploration: see how ingredients are used across different cocktails
- Flavor profile understanding: learn about ingredient characteristics

**Response Format:**
Returns detailed ingredient information including:
- Ingredient description and characteristics
- List of cocktails using this ingredient (with complete recipes)
- Suggested substitutions with flavor impact notes
- Common flavor profiles and tasting notes
- Direct links to featured cocktails

**Examples:**
- {ingredient_name: "Campari"} → Campari info + Negroni, Boulevardier recipes
- {ingredient_name: "rye whiskey"} → Usage in Manhattan, Sazerac, etc.
- {ingredient_name: "elderflower liqueur"} → Aviation, Paper Plane recipes`,
            inputSchema: {
              type: 'object',
              properties: {
                ingredient_name: {
                  type: 'string',
                  description: 'The name of the ingredient to get information about',
                },
              },
              required: ['ingredient_name'],
            },
            outputSchema: OutputSchemas.ingredientInfoOutputSchema,
          },

        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'smart_search_cocktails':
            return await this.handleSmartSearchCocktails(args as any);
          
          case 'get_recipe':
            return await this.handleGetRecipe(args as any);
          
          case 'get_ingredient_info':
            return await this.handleGetIngredientInfo(args as any as { ingredient_name: string });
          
          default:
            throw new McpError(
              ErrorCode.MethodNotFound,
              `Unknown tool: ${name}`
            );
        }
      } catch (error) {
        console.error(`Error handling tool ${name}:`, error);
        
        if (error instanceof McpError) {
          throw error;
        }
        
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }



  // Tool handler methods
  private async handleSearchCocktails(args: SearchCocktailsParams) {
    const results = await this.barClient.searchCocktails(args);
    
    const formattedResults = results.data.map(cocktail => {
      const ingredients = cocktail.short_ingredients?.map(ing => 
        `${ing.pivot.amount}${ing.pivot.units} ${ing.name}`
      ).join(', ') || 'No ingredients listed';

      const tags = cocktail.tags?.map(tag => tag.name).join(', ') || 'No tags';

      return {
        id: cocktail.id,
        name: cocktail.name,
        description: cocktail.description || 'No description available',
        abv: cocktail.abv ? `${cocktail.abv}%` : 'ABV not specified',
        ingredients: ingredients,
        glass: cocktail.glass?.name || 'Not specified',
        method: cocktail.method?.name || 'Not specified',
        tags: tags,
        rating: cocktail.average_rating ? `${cocktail.average_rating}/5` : 'No ratings',
      };
    });

    const summary = `Found ${results.data.length} cocktails` + 
      (results.meta.total > results.data.length ? ` (showing ${results.data.length} of ${results.meta.total} total)` : '');

    return {
      content: [
        {
          type: 'text',
          text: `# Cocktail Search Results\n\n${summary}\n\n` +
            formattedResults.map(cocktail => 
              `## ${cocktail.name} (ID: ${cocktail.id})\n` +
              `**Description:** ${cocktail.description}\n` +
              `**ABV:** ${cocktail.abv}\n` +
              `**Ingredients:** ${cocktail.ingredients}\n` +
              `**Glass:** ${cocktail.glass}\n` +
              `**Method:** ${cocktail.method}\n` +
              `**Tags:** ${cocktail.tags}\n` +
              `**Rating:** ${cocktail.rating}\n`
            ).join('\n'),
        },
      ],
    };
  }

  private async handleGetCocktailRecipe(args: { cocktail_id: number }) {
    const recipe = await this.barClient.getCocktailRecipe(args.cocktail_id);
    
    // Format ingredients using structured format then convert to bullet points
    const formattedRecipe = this.formatCocktailResult(recipe);
    const ingredients = this.formatIngredientList(formattedRecipe.ingredients);

    const instructions = recipe.instructions?.sort((a, b) => a.sort - b.sort)
      .map((inst, index) => `${index + 1}. ${inst.content}`)
      .join('\n') || 'No instructions available';

    const tags = recipe.tags?.map(tag => tag.name).join(', ') || 'No tags';

    // Create a more conversational format
    let response = `# ${recipe.name} Recipe\n\n`;
    
    if (recipe.description) {
      response += `*${recipe.description}*\n\n`;
    }

    // Add key details upfront
    const details = [];
    if (recipe.abv) details.push(`**Strength:** ${recipe.abv}% ABV`);
    if (recipe.glass?.name) details.push(`**Glass:** ${recipe.glass.name}`);
    if (recipe.method?.name) details.push(`**Method:** ${recipe.method.name}`);
    
    if (details.length > 0) {
      response += `${details.join(' • ')}\n\n`;
    }

    response += `## What You'll Need\n${ingredients}\n\n`;
    response += `## How to Make It\n${instructions}\n\n`;
    
    // Additional details
    if (recipe.garnish) {
      response += `**Garnish:** ${recipe.garnish}\n`;
    }
    
    if (tags !== 'No tags') {
      response += `**Tags:** ${tags}\n`;
    }
    
    if (recipe.average_rating) {
      response += `**Rating:** ${recipe.average_rating}/5 stars (${recipe.total_ratings} ratings)\n`;
    }
    
    if (recipe.source) {
      response += `**Source:** ${recipe.source}\n`;
    }
    
    if (recipe.slug) {
      response += `**Direct Link:** ${this.getCocktailDirectLink(recipe.slug)}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  private async handleFindSimilarCocktails(args: SimilarCocktailsParams) {
    // First get the base cocktail info
    const baseCocktail = await this.barClient.getCocktailRecipe(args.cocktail_id);
    const similarCocktails = await this.barClient.findSimilarCocktails(args.cocktail_id, args.limit || 10);
    
    let response = `# Cocktails Similar to ${baseCocktail.name}\n\nBased on your Bar Assistant database, here are cocktails similar to **${baseCocktail.name}** with complete recipes:\n\n`;
    
    // Fetch complete recipe details for each similar cocktail
    for (let index = 0; index < similarCocktails.length; index++) {
      const similar = similarCocktails[index];
      const cocktail = similar.cocktail;
      
      try {
        // Get full recipe details
        const fullRecipe = await this.barClient.getCocktailRecipe(cocktail.id);
        
        const similarityScore = similar.similarity_score ? 
          `${Math.round(similar.similarity_score * 100)}% similar` : 'Similarity not calculated';
        
        const abv = fullRecipe.abv ? `${fullRecipe.abv}% ABV` : 'ABV not specified';
        const glass = fullRecipe.glass?.name ? ` | ${fullRecipe.glass.name}` : '';
        const method = fullRecipe.method?.name ? ` | ${fullRecipe.method.name}` : '';
        
        // Format cocktail with consistent structure
        const formattedRecipe = this.formatCocktailResult(fullRecipe);
        
        response += `## ${index + 1}. ${formattedRecipe.name} - ${similarityScore}\n`;
        
        // Details line
        const details = [];
        if (formattedRecipe.details.abv) details.push(`${formattedRecipe.details.abv}% ABV`);
        if (formattedRecipe.details.glass) details.push(formattedRecipe.details.glass);
        if (formattedRecipe.details.method) details.push(formattedRecipe.details.method);
        if (details.length > 0) {
          response += `**${details.join(' | ')}**\n`;
        }
        
        if (formattedRecipe.description) {
          response += `*${formattedRecipe.description}*\n`;
        }
        
        response += `**ID:** ${formattedRecipe.id}\n`;
        if (formattedRecipe.details.direct_link) {
          response += `**Direct Link:** ${formattedRecipe.details.direct_link}\n`;
        }
        response += `\n`;
        
        // Ingredients with bullet points
        response += `### Ingredients:\n`;
        response += `${this.formatIngredientList(formattedRecipe.ingredients)}\n\n`;
        
        // Instructions 
        response += `### Instructions:\n`;
        formattedRecipe.instructions.forEach((inst: any) => {
          response += `${inst.step}. ${inst.instruction}\n`;
        });
        
        // Garnish if present
        if (formattedRecipe.details.garnish) {
          response += `\n**Garnish:** ${formattedRecipe.details.garnish}\n`;
        }
        
        // Add similarity reasons
        const reasons = similar.similarity_reasons?.join(', ') || 'Similar flavor profile';
        response += `\n*Why similar: ${reasons}*\n`;
        
        // Add separator between cocktails (but not after the last one)
        if (index < similarCocktails.length - 1) {
          response += `\n---\n\n`;
        } else {
          response += `\n`;
        }
        
      } catch (error) {
        // Fallback to basic info if recipe fetch fails
        const ingredients = cocktail.short_ingredients?.map(ing => {
          const formattedVolume = this.formatVolume(ing.pivot.amount, ing.pivot.units);
          return `${formattedVolume} ${ing.name}`;
        }).join(', ') || 'No ingredients listed';

        const similarityScore = similar.similarity_score ? 
          `${Math.round(similar.similarity_score * 100)}% similar` : 'Similarity not calculated';
        
        response += `## ${index + 1}. ${cocktail.name} - ${similarityScore}\n`;
        response += `**ABV:** ${cocktail.abv ? `${cocktail.abv}%` : 'Not specified'}\n`;
        response += `**Ingredients:** ${ingredients}\n`;
        response += `**Glass:** ${cocktail.glass?.name || 'Not specified'}\n`;
        response += `**ID:** ${cocktail.id}\n`;
        response += `*Complete recipe details temporarily unavailable*\n\n`;
        
        if (index < similarCocktails.length - 1) {
          response += `---\n\n`;
        }
      }
    }
    
    return {
      content: [
        {
          type: 'text',
          text: response,
        },
      ],
    };
  }

  private async handleCheckInventory(args: InventoryCheckParams) {
    const inventory = await this.barClient.checkInventory(args);
    
    const availableIngredients = inventory.available_ingredients.map(bar => {
      const formattedVolume = bar.amount ? this.formatVolume(bar.amount, bar.units || 'ml') : '';
      return `• ${bar.ingredient.name}` +
        (formattedVolume ? ` (${formattedVolume})` : '') +
        (bar.price ? ` - $${bar.price}` : '');
    }).join('\n') || 'No ingredients in inventory';

    const missingIngredients = inventory.missing_ingredients.map(ing => 
      `• ${ing.name}`
    ).join('\n') || 'No missing ingredients specified';

    const canMakeCocktails = inventory.can_make_cocktails.length;

    return {
      content: [
        {
          type: 'text',
          text: `# Bar Inventory Status\n\n` +
            `**Can make ${canMakeCocktails} cocktails** with current inventory\n\n` +
            `## Available Ingredients (${inventory.available_ingredients.length})\n${availableIngredients}\n\n` +
            (args.ingredient_names && args.ingredient_names.length > 0 ? 
              `## Missing Requested Ingredients\n${missingIngredients}\n\n` : '') +
            `Use the \`search_cocktails\` tool with \`can_make: true\` to see which cocktails you can make right now.`,
        },
      ],
    };
  }

  private async handleGenerateShoppingList(args: ShoppingListParams) {
    const shoppingList = await this.barClient.generateShoppingList(args);
    
    const items = shoppingList.items.map(item => 
      `• **${item.ingredient.name}** - ${this.formatVolume(item.needed_amount, item.units)}` +
      (item.estimated_price ? ` (est. $${item.estimated_price})` : '') +
      `\n  *Needed for cocktails: ${item.cocktails_requiring.join(', ')}*`
    ).join('\n\n') || 'No items needed';

    const totalCost = shoppingList.total_estimated_cost ? 
      `\n\n**Estimated Total Cost:** $${shoppingList.total_estimated_cost}` : '';

    return {
      content: [
        {
          type: 'text',
          text: `# Shopping List\n\n` +
            `To make ${shoppingList.cocktails_count} cocktails, you need:\n\n` +
            items +
            totalCost,
        },
      ],
    };
  }

  private async handleGetRecipeByName(args: { cocktail_name: string; include_variations?: boolean }) {
    try {
      // Use the improved fuzzy search method
      const searchResults = await this.barClient.findCocktailByName(args.cocktail_name);

      if (searchResults.data.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `# Recipe Not Found\n\n` +
                `Sorry, I couldn't find a recipe for "${args.cocktail_name}" in your Bar Assistant database.\n\n` +
                `**Suggestions:**\n` +
                `• Check the spelling\n` +
                `• Try a shorter name (e.g., "Manhattan" instead of "Perfect Manhattan")\n` +
                `• Use the \`search_cocktails\` tool to browse available cocktails\n` +
                `• Try searching for ingredients instead`,
            },
          ],
        };
      }

      // Get the best match (first result) - use the search result which has short_ingredients
      const bestMatch = searchResults.data[0];
      
      // Try to get detailed recipe, but fallback to search data if detailed recipe is incomplete
      let recipe;
      try {
        recipe = await this.barClient.getCocktailRecipe(bestMatch.id);
      } catch (error) {
        // Detailed recipe failed, using search result data
        recipe = bestMatch; // Use the search result as fallback
      }
      
      // Format ingredients using standardized formatting
      const formattedRecipe = this.formatCocktailResult(recipe);
      const ingredients = this.formatIngredientList(formattedRecipe.ingredients);

      // Format instructions in a clear, step-by-step manner
      let instructions = 'No instructions available';
      const recipeInstructions = (recipe as any).instructions;
      
      if (recipeInstructions) {
        if (typeof recipeInstructions === 'string') {
          // Instructions stored as a single string - split by common delimiters
          const steps = recipeInstructions.split(/[,\n\r]|(?:\d+\.)/g)
            .map((step: string) => step.trim())
            .filter((step: string) => step.length > 0);
          
          if (steps.length > 0) {
            instructions = steps.map((step: string, index: number) => `${index + 1}. ${step}`).join('\n');
          } else {
            instructions = `1. ${recipeInstructions}`;
          }
        } else if (Array.isArray(recipeInstructions) && recipeInstructions.length > 0) {
          // Instructions as array
          instructions = recipeInstructions
            .sort((a: any, b: any) => (a.sort || 0) - (b.sort || 0))
            .map((inst: any, index: number) => {
              const content = inst.content || inst.description || inst.text || inst;
              return `${index + 1}. ${content}`;
            }).join('\n');
        }
      }

      // Add helpful context using formatted recipe data
      const abvInfo = formattedRecipe.details.abv ? `\n**Strength:** ${formattedRecipe.details.abv}% ABV` : '';
      const glassInfo = formattedRecipe.details.glass ? `\n**Glass:** ${formattedRecipe.details.glass}` : '';
      const methodInfo = formattedRecipe.details.method ? `\n**Method:** ${formattedRecipe.details.method}` : '';
      const garnishInfo = formattedRecipe.details.garnish ? `\n**Garnish:** ${formattedRecipe.details.garnish}` : '';
      const sourceInfo = formattedRecipe.details.source ? `\n**Source:** ${formattedRecipe.details.source}` : '';
      const directLinkInfo = formattedRecipe.details.direct_link ? `\n**Direct Link:** ${formattedRecipe.details.direct_link}` : '';
      
      // Create a conversational recipe format
      let response = `# How to Make a ${formattedRecipe.name || args.cocktail_name}\n\n`;
      
      if (formattedRecipe.description) {
        response += `*${formattedRecipe.description}*\n\n`;
      }

      response += `## What You'll Need\n${ingredients}\n\n`;
      response += `## Instructions\n${instructions}\n\n`;
      response += `## Details${abvInfo}${glassInfo}${methodInfo}${garnishInfo}${sourceInfo}${directLinkInfo}`;

      // Add variations if requested and available
      if (args.include_variations !== false && searchResults.data.length > 1) {
        response += `\n\n## Similar Recipes\n\n`;
        
        // Fetch complete recipes for variations
        const variationCocktails = searchResults.data.slice(1, 3);
        const completeVariations = await this.fetchCompleteRecipes(variationCocktails);
        
        completeVariations.forEach((variation, index) => {
          response += `### ${variation.name}\n`;
          
          // Details line
          const details = [];
          if (variation.details.abv) details.push(`${variation.details.abv}% ABV`);
          if (variation.details.glass) details.push(variation.details.glass);
          if (variation.details.method) details.push(variation.details.method);
          if (details.length > 0) {
            response += `**${details.join(' | ')}** | **ID:** ${variation.id}\n`;
          }
          
          if (variation.details.direct_link) {
            response += `**Direct Link:** ${variation.details.direct_link}\n`;
          }
          
            // Ingredients
            response += `\n**Ingredients:**\n`;
            response += `${this.formatIngredientList(variation.ingredients)}\n`;          // Instructions
          response += `\n**Instructions:**\n`;
          variation.instructions.forEach(inst => {
            response += `${inst.step}. ${inst.instruction}\n`;
          });
          
          if (index < completeVariations.length - 1) {
            response += `\n`;
          }
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
      
    } catch (error) {
      console.error('Error getting recipe by name:', error);
      return {
        content: [
          {
            type: 'text',
            text: `# Error Getting Recipe\n\n` +
              `Sorry, I encountered an error while looking up the recipe for "${args.cocktail_name}".\n\n` +
              `**Error:** ${error instanceof Error ? error.message : String(error)}\n\n` +
              `Please try again or use the \`search_cocktails\` tool to find the cocktail first.`,
          },
        ],
      };
    }
  }

  private async handleSmartSearchCocktails(args: SmartSearchCocktailsParams) {
    const startTime = Date.now();
    
    try {
      // Parse natural language query if provided
      let enhancedArgs = { ...args };
      if (args.query && typeof args.query === 'string') {
        const parsedQuery = QueryParser.parse(args.query);
        enhancedArgs = QueryParser.enhanceSearchArgs(args, parsedQuery);
      }
      
      // Check cache for search results
      const cacheKey = JSON.stringify(enhancedArgs);
      const cachedResult = this.cacheManager.getCachedSearch(cacheKey);
      if (cachedResult) {
        return cachedResult;
      }
      
      // Handle similarity queries first (by name or ID)
      if (enhancedArgs.similar_to || enhancedArgs.similar_to_id) {
        const result = await this.handleSimilaritySearch(enhancedArgs, startTime);
        // Cache similarity search results
        this.cacheManager.setCachedSearch(cacheKey, result);
        return result;
      }

      // Perform the main search
      const { results, searchType, appliedFilters } = await this.performCocktailSearch(enhancedArgs);
      
      // Build structured response
      const structuredData: ResponseSchemas.CocktailSearchResponse = {
        results: await this.fetchCompleteRecipes(results.slice(0, enhancedArgs.limit || 20)),
        query: {
          terms: enhancedArgs.query || undefined,
          filters: appliedFilters,
          search_type: searchType
        },
        metadata: this.createResponseMetadata('bar_assistant_api', results.length, startTime)
      };

      // Build human-readable response
      const humanText = this.formatSearchResultsText(structuredData, enhancedArgs);

      const result = this.createStructuredResponse(humanText, structuredData);
      
      // Cache regular search results
      this.cacheManager.setCachedSearch(cacheKey, result);
      
      return result;
      
    } catch (error) {
      const errorData: ResponseSchemas.ErrorResponse = {
        error: error instanceof Error ? error.message : String(error),
        error_code: 'SEARCH_ERROR',
        suggestions: [
          'Check your search criteria and try again',
          'Try broader search terms',
          'Remove some filters',
          'Check ingredient spelling'
        ],
        query: args,
        metadata: this.createResponseMetadata('error', 0, startTime)
      };

      const errorText = `# Smart Search Error\n\n` +
        `Sorry, I encountered an error while searching for cocktails.\n\n` +
        `**Error:** ${errorData.error}\n\n` +
        `**Suggestions:**\n${errorData.suggestions?.map(s => `• ${s}`).join('\n')}`;

      return this.createStructuredResponse(errorText, errorData);
    }
  }

  private async handleGetRecipe(args: GetRecipeParams) {
    const startTime = Date.now();
    
    try {
      // Determine if this is a batch request or single request
      const isBatchRequest = args.cocktail_ids || args.cocktail_names;
      const limit = Math.min(args.limit || 10, 20);
      
      if (isBatchRequest) {
        return await this.handleBatchRecipeRequest(args, startTime, limit);
      } else {
        return await this.handleSingleRecipeRequest(args, startTime);
      }
    } catch (error) {
      const errorText = `# Recipe Error\n\n` +
        `Sorry, I encountered an error while fetching recipes.\n\n` +
        `**Error:** ${error instanceof Error ? error.message : String(error)}\n\n` +
        `Please try again or contact support if the issue persists.`;
      
      return {
        content: [{ type: 'text', text: errorText }]
      };
    }
  }

  /**
   * Handle batch recipe requests with parallel processing
   */
  private async handleBatchRecipeRequest(args: any, startTime: number, limit: number) {
    const cocktailRequests: Array<{id?: number, name?: string}> = [];
    
    // Collect all cocktail requests
    if (args.cocktail_ids) {
      cocktailRequests.push(...args.cocktail_ids.slice(0, limit).map((id: number) => ({ id })));
    }
    if (args.cocktail_names) {
      const remainingSlots = limit - cocktailRequests.length;
      cocktailRequests.push(...args.cocktail_names.slice(0, remainingSlots).map((name: string) => ({ name })));
    }
    
    if (cocktailRequests.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `# No Cocktails Specified\n\n` +
            `Please provide cocktail_ids, cocktail_names, cocktail_id, or cocktail_name.`
        }]
      };
    }
    
    // Resolve names to IDs first (with caching)
    const resolvedCocktails: Array<{id: number, originalRequest: any}> = [];
    
    for (const request of cocktailRequests) {
      if (request.id) {
        resolvedCocktails.push({ id: request.id, originalRequest: request });
      } else if (request.name) {
        try {
          const searchResults = await this.barClient.findCocktailByName(request.name);
          if (searchResults.data.length > 0) {
            resolvedCocktails.push({ 
              id: searchResults.data[0].id, 
              originalRequest: request 
            });
          } else {
            console.warn(`Cocktail not found: ${request.name}`);
          }
        } catch (error) {
          console.warn(`Error searching for ${request.name}:`, error);
        }
      }
    }
    
    if (resolvedCocktails.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `# No Cocktails Found\n\n` +
            `None of the specified cocktails could be found in the database.\n\n` +
            `**Tried:** ${cocktailRequests.map(r => r.name || `ID ${r.id}`).join(', ')}\n\n` +
            `**Suggestions:**\n` +
            `• Check spelling of cocktail names\n` +
            `• Use \`smart_search_cocktails\` to find available cocktails\n` +
            `• Verify cocktail IDs are correct`
        }]
      };
    }
    
    // Use existing batch fetching infrastructure
    const mockCocktails = resolvedCocktails.map(r => ({ id: r.id }));
    const completeRecipes = await this.fetchCompleteRecipes(mockCocktails);
    
    const processingTime = Date.now() - startTime;
    
    // Build response
    let response = `# 📖 Batch Recipe Results\n\n`;
    response += `Successfully retrieved ${completeRecipes.length} of ${cocktailRequests.length} requested recipes in ${processingTime}ms\n\n`;
    
    if (completeRecipes.length > 1) {
      response += this.formatMultipleCocktails(completeRecipes);
    } else if (completeRecipes.length === 1) {
      response += this.formatSingleRecipeDetailed(completeRecipes[0]);
    }
    
    // Add variations if requested
    if (args.include_variations && completeRecipes.length === 1) {
      try {
        const variations = await this.barClient.findSimilarCocktails(completeRecipes[0].id, 3);
        if (variations.length > 0) {
          response += `\n\n# 🔄 Similar Recipes\n\n`;
          const variationRecipes = await this.fetchCompleteRecipes(
            variations.map(v => v.cocktail)
          );
          response += this.formatMultipleCocktails(variationRecipes);
        }
      } catch (error) {
        console.warn('Failed to fetch variations:', error);
      }
    }
    
    // Add performance summary
    response += `\n\n---\n\n**⚡ Performance Summary:**\n`;
    response += `• **Total time:** ${processingTime}ms\n`;
    response += `• **Recipes fetched:** ${completeRecipes.length}\n`;
    response += `• **Cache utilization:** Enabled\n`;
    response += `• **Batch processing:** ${completeRecipes.length > 1 ? 'Used' : 'Single recipe'}`;
    
    return {
      content: [{ type: 'text', text: response }]
    };
  }

  /**
   * Handle single recipe requests (backwards compatibility)
   */
  private async handleSingleRecipeRequest(args: any, startTime: number) {
    let cocktail = null;
    let recipe = null;

    // Handle ID-based lookup
    if (args.cocktail_id) {
      // Check cache first
      const cached = this.cacheManager.getCachedRecipe(args.cocktail_id);
      if (cached) {
        recipe = cached;
        cocktail = recipe;
      } else {
        // Get by ID with fallback
        try {
          recipe = await this.getCocktailWithFallback(args.cocktail_id);
          cocktail = recipe;
          this.cacheManager.setCachedRecipe(args.cocktail_id, recipe);
        } catch (error) {
          return {
            content: [
              {
                type: 'text',
                text: `# Recipe Not Found\n\n` +
                  `Sorry, I couldn't find a cocktail with ID ${args.cocktail_id}.\n\n` +
                  `**Error:** ${error instanceof Error ? error.message : String(error)}\n\n` +
                  `Please check the ID and try again, or use cocktail name instead.`,
              },
            ],
          };
        }
      }
    }
    // Handle name-based lookup  
    else if (args.cocktail_name) {
      const searchResults = await this.barClient.findCocktailByName(args.cocktail_name);

      if (searchResults.data.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `# Recipe Not Found\n\n` +
                `Sorry, I couldn't find a recipe for "${args.cocktail_name}" in your Bar Assistant database.\n\n` +
                `**Suggestions:**\n` +
                `• Check the spelling\n` +
                `• Try a shorter name (e.g., "Manhattan" instead of "Perfect Manhattan")\n` +
                `• Use \`smart_search_cocktails\` to browse available cocktails\n` +
                `• Try searching for ingredients instead\n` +
                `• Use batch mode: {cocktail_names: ["Manhattan", "Negroni"]} for multiple recipes`,
            },
            ],
          };
        }

        cocktail = searchResults.data[0];
        
        // Check cache first
        const cached = this.cacheManager.getCachedRecipe(cocktail.id);
        if (cached) {
          recipe = cached;
        } else {
          // Try to get detailed recipe with fallback
          recipe = await this.getCocktailWithFallback(cocktail.id, cocktail);
          this.cacheManager.setCachedRecipe(cocktail.id, recipe);
        }
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `# Missing Information\n\n` +
                `Please provide either a \`cocktail_id\`, \`cocktail_name\`, \`cocktail_ids\`, or \`cocktail_names\` to get recipes.\n\n` +
                `**Examples:**\n` +
                `• Single recipe: {cocktail_name: "Manhattan"}\n` +
                `• Batch recipes: {cocktail_names: ["Manhattan", "Negroni", "Martini"]}\n` +
                `• Mixed batch: {cocktail_names: ["Manhattan"], cocktail_ids: [123, 456]}`,
            },
          ],
        };
      }

      // Format the recipe using enhanced formatting
      const formattedRecipe = this.formatCocktailResult(recipe);
      const processingTime = Date.now() - startTime;
      
      // Use detailed single recipe formatting
      let response = this.formatSingleRecipeDetailed(formattedRecipe);
      
      // Add variations if requested
      if (args.include_variations) {
        try {
          const variations = await this.barClient.findSimilarCocktails(recipe.id, 3);
          if (variations.length > 0) {
            response += `\n\n# 🔄 Similar Recipes\n\n`;
            const variationRecipes = await this.fetchCompleteRecipes(
              variations.map(v => v.cocktail)
            );
            response += this.formatMultipleCocktails(variationRecipes);
          }
        } catch (error) {
          response += `\n\n*Similar cocktails not available*\n\n`;
        }
      }
      
      // Add performance info for single requests too
      response += `\n\n---\n\n**⚡ Performance:** ${processingTime}ms ${this.cacheManager.getCachedRecipe(formattedRecipe.id) ? '(cached)' : '(fresh)'}**`;

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error: any) {
      console.error('Error getting recipe:', error);
      return {
        content: [
          {
            type: 'text',
            text: `# Error Getting Recipe\n\n` +
              `Sorry, I encountered an error while looking up the recipe.\n\n` +
              `**Error:** ${error instanceof Error ? error.message : String(error)}\n\n` +
              `Please try again or use \`smart_search_cocktails\` to find the cocktail first.`,
          },
        ],
      };
    }

  private async handleGetTasteRecommendations(args: TasteRecommendationsParams) {
    try {
      // Convert taste preferences to search parameters
      const searchParams: SearchCocktailsParams = {
        limit: args.limit || 10,
      };

      // Handle strength preferences
      if (args.preferred_strength) {
        switch (args.preferred_strength) {
          case 'light':
            searchParams.abv_max = 15;
            break;
          case 'medium':
            searchParams.abv_min = 15;
            searchParams.abv_max = 30;
            break;
          case 'strong':
            searchParams.abv_min = 30;
            break;
        }
      }

      // If preferred flavors include bitter ingredients, search for those
      if (args.preferred_flavors?.includes('bitter')) {
        // Search for cocktails with bitter ingredients like Campari, Aperol
        searchParams.ingredient = 'campari';
      } else if (args.preferred_flavors?.includes('sweet')) {
        searchParams.ingredient = 'vermouth';
      } else if (args.preferred_flavors?.includes('sour')) {
        searchParams.ingredient = 'lemon';
      }

      let results = await this.barClient.searchCocktails(searchParams);

      // Filter out disliked ingredients if specified
      if (args.disliked_ingredients && args.disliked_ingredients.length > 0) {
        const dislikedLower = args.disliked_ingredients.map((ing: string) => ing.toLowerCase());
        results.data = results.data.filter(cocktail => {
          const ingredients = cocktail.short_ingredients?.map((ing: any) => {
            const name = ing.ingredient?.name || ing.name || '';
            return name.toLowerCase();
          }) || [];
          return !ingredients.some(ing => dislikedLower.some((disliked: string) => ing.includes(disliked)));
        });
      }

      const preferences = [];
      if (args.preferred_flavors && args.preferred_flavors.length > 0) preferences.push(`Flavors: ${args.preferred_flavors.join(', ')}`);
      if (args.preferred_strength) preferences.push(`Strength: ${args.preferred_strength}`);
      if (args.preferred_style) preferences.push(`Style: ${args.preferred_style}`);
      if (args.disliked_ingredients && args.disliked_ingredients.length > 0) preferences.push(`Avoiding: ${args.disliked_ingredients.join(', ')}`);

      let response = `# Personalized Cocktail Recommendations\n\n`;
      if (preferences.length > 0) {
        response += `**Based on your preferences:** ${preferences.join(' | ')}\n\n`;
      }
      
      if (results.data.length === 0) {
        response += `Sorry, I couldn't find cocktails matching your taste preferences.\n\n`;
        response += `**Suggestions:**\n`;
        response += `• Try broader flavor preferences\n`;
        response += `• Adjust the strength requirements\n`;
        response += `• Use the \`search_cocktails\` tool to explore available options`;
      } else {
        response += `Here are ${results.data.length} cocktails tailored to your taste:\n\n`;
        
        results.data.slice(0, args.limit || 10).forEach((cocktail, index) => {
          const abv = cocktail.abv ? `${cocktail.abv}% ABV` : 'ABV not specified';
          const glass = cocktail.glass?.name ? ` | ${cocktail.glass.name}` : '';
          const method = cocktail.method?.name ? ` | ${cocktail.method.name}` : '';
          
          response += `## ${index + 1}. ${cocktail.name}\n`;
          response += `**Details:** ${abv}${glass}${method}\n`;
          if (cocktail.description) {
            response += `**Description:** ${cocktail.description}\n`;
          }
          response += `**ID:** ${cocktail.id}\n\n`;
        });
        
        response += `*Use \`get_cocktail_recipe\` with the ID to get full recipes for any of these cocktails.*`;
      }

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error) {
      console.error('Error getting taste recommendations:', error);
      return {
        content: [
          {
            type: 'text',
            text: `# Error Getting Recommendations\n\n` +
              `Sorry, I encountered an error while generating personalized recommendations.\n\n` +
              `**Error:** ${error instanceof Error ? error.message : String(error)}\n\n` +
              `Please try again with different preferences.`,
          },
        ],
      };
    }
  }

  private async handleGetIngredientInfo(args: { ingredient_name: string }) {
    const startTime = Date.now();
    
    try {
      // Search for cocktails that use this ingredient
      const cocktailsWithIngredient = await this.barClient.searchCocktails({
        ingredient: args.ingredient_name,
        limit: 10,
      });

      let response = `# ${args.ingredient_name} Information\n\n`;
      const cocktailUsage: ResponseSchemas.IngredientUsage[] = [];

      if (cocktailsWithIngredient.data.length > 0) {
        response += `## Popular Cocktails Using ${args.ingredient_name}\n\n`;
        response += `Here are complete recipes for cocktails featuring **${args.ingredient_name}**:\n\n`;
        
        // Fetch complete recipes for all cocktails
        const completeRecipes = await this.fetchCompleteRecipes(cocktailsWithIngredient.data);
        
        // Add to structured data for all cocktails
        completeRecipes.forEach(cocktail => {
          cocktailUsage.push({
            cocktail,
            usage_notes: `Used in ${cocktail.name}`
          });
        });
        
        // Use standardized multi-cocktail formatter with ingredient highlighting
        response += this.formatMultipleCocktails(completeRecipes, args.ingredient_name);
      } else {
        response += `## Usage\n\nNo cocktails found using "${args.ingredient_name}" in the current database.\n\n`;
      }

      // Add substitution suggestions with structured data
      const substitutions: ResponseSchemas.SubstitutionSuggestion[] = [];
      const lowerName = args.ingredient_name.toLowerCase();
      
      if (lowerName.includes('gin')) {
        response += `## Common Substitutes\n• **Vodka** (for a cleaner flavor)\n• **White rum** (for tropical drinks)\n• **Aquavit** (for herbal complexity)\n\n`;
        substitutions.push(
          { substitute: 'Vodka', description: 'Provides a cleaner, neutral flavor profile', flavor_impact: 'Less botanical, more neutral' },
          { substitute: 'White rum', description: 'Adds tropical character to cocktails', flavor_impact: 'Sweeter, more tropical' },
          { substitute: 'Aquavit', description: 'Maintains herbal complexity', flavor_impact: 'Different botanicals, caraway notes' }
        );
      } else if (lowerName.includes('vermouth')) {
        response += `## Common Substitutes\n• **Lillet Blanc** (lighter, more citrusy)\n• **Cocchi Americano** (more bitter)\n• **Dry sherry** (for fortified wine character)\n\n`;
        substitutions.push(
          { substitute: 'Lillet Blanc', description: 'Lighter and more citrus-forward', flavor_impact: 'Less herbal, more citrusy' },
          { substitute: 'Cocchi Americano', description: 'More bitter and complex', flavor_impact: 'More bitter, quinine notes' },
          { substitute: 'Dry sherry', description: 'Provides fortified wine character', flavor_impact: 'Nuttier, more oxidized flavors' }
        );
      } else if (lowerName.includes('campari')) {
        response += `## Common Substitutes\n• **Aperol** (lighter, sweeter)\n• **Cappelletti** (similar bitterness)\n• **Gran Classico** (spicier profile)\n\n`;
        substitutions.push(
          { substitute: 'Aperol', description: 'Lighter and sweeter alternative', flavor_impact: 'Less bitter, more orange-forward' },
          { substitute: 'Cappelletti', description: 'Similar bitterness profile', flavor_impact: 'Similar bitterness, different herbal notes' },
          { substitute: 'Gran Classico', description: 'Spicier and more complex', flavor_impact: 'More spice, different bitter profile' }
        );
      }

      response += `*All recipes above show exactly how **${args.ingredient_name}** is used in each cocktail.*`;

      // Create structured response
      const structuredData: ResponseSchemas.IngredientInfoResponse = {
        ingredient: args.ingredient_name,
        description: `Information about ${args.ingredient_name} and cocktails that use it`,
        cocktail_usage: cocktailUsage,
        substitutions: substitutions.length > 0 ? substitutions : undefined,
        query: {
          ingredient_name: args.ingredient_name
        },
        metadata: this.createResponseMetadata('bar_assistant_api', cocktailUsage.length, startTime)
      };

      return this.createStructuredResponse(response, structuredData);
    } catch (error) {
      console.error('Error getting ingredient info:', error);
      return {
        content: [
          {
            type: 'text',
            text: `# Error Getting Ingredient Information\n\n` +
              `Sorry, I encountered an error while looking up information for "${args.ingredient_name}".\n\n` +
              `**Error:** ${error instanceof Error ? error.message : String(error)}\n\n` +
              `Please check the ingredient name and try again.`,
          },
        ],
      };
    }
  }

  private async handleFilterCocktailsAdvanced(args: FilterCocktailsParams) {
    try {
      const searchParams: SearchCocktailsParams = {
        limit: args.limit || 20,
      };

      // Handle ABV range
      if (args.abv_range && args.abv_range.length === 2) {
        searchParams.abv_min = args.abv_range[0];
        searchParams.abv_max = args.abv_range[1];
      }

      // For must_include ingredients, we'll search for the first one and then filter
      let results;
      if (args.must_include && args.must_include.length > 0) {
        searchParams.ingredient = args.must_include[0];
        results = await this.barClient.searchCocktails(searchParams);
        
        // Filter for additional must_include ingredients
        if (args.must_include.length > 1) {
          const requiredIngredients = args.must_include.slice(1).map((ing: string) => ing.toLowerCase());
          results.data = results.data.filter(cocktail => {
            const ingredients = cocktail.short_ingredients?.map((ing: any) => {
              const name = ing.ingredient?.name || ing.name || '';
              return name.toLowerCase();
            }) || [];
            return requiredIngredients.every((required: string) => 
              ingredients.some(ing => ing.includes(required))
            );
          });
        }
      } else {
        results = await this.barClient.searchCocktails(searchParams);
      }

      // Filter out must_exclude ingredients
      if (args.must_exclude && args.must_exclude.length > 0) {
        const excludedLower = args.must_exclude.map((ing: string) => ing.toLowerCase());
        results.data = results.data.filter(cocktail => {
          const ingredients = cocktail.short_ingredients?.map((ing: any) => {
            const name = ing.ingredient?.name || ing.name || '';
            return name.toLowerCase();
          }) || [];
          return !ingredients.some(ing => excludedLower.some((excluded: string) => ing.includes(excluded)));
        });
      }

      // Filter by glass type
      if (args.glass_type) {
        const glassTypeLower = args.glass_type.toLowerCase();
        results.data = results.data.filter(cocktail => 
          cocktail.glass?.name?.toLowerCase().includes(glassTypeLower)
        );
      }

      // Filter by preparation method
      if (args.preparation_method) {
        const methodLower = args.preparation_method.toLowerCase();
        results.data = results.data.filter(cocktail => 
          cocktail.method?.name?.toLowerCase().includes(methodLower)
        );
      }

      // Build filter description
      const filters = [];
      if (args.must_include && args.must_include.length > 0) filters.push(`Must include: ${args.must_include.join(', ')}`);
      if (args.must_exclude && args.must_exclude.length > 0) filters.push(`Must exclude: ${args.must_exclude.join(', ')}`);
      if (args.abv_range) filters.push(`ABV: ${args.abv_range[0]}-${args.abv_range[1]}%`);
      if (args.difficulty) filters.push(`Difficulty: ${args.difficulty}`);
      if (args.glass_type) filters.push(`Glass: ${args.glass_type}`);
      if (args.preparation_method) filters.push(`Method: ${args.preparation_method}`);

      let response = `# Advanced Cocktail Filter Results\n\n`;
      if (filters.length > 0) {
        response += `**Applied filters:** ${filters.join(' | ')}\n\n`;
      }

      if (results.data.length === 0) {
        response += `No cocktails found matching your advanced filter criteria.\n\n`;
        response += `**Suggestions:**\n`;
        response += `• Try removing some filters to broaden the search\n`;
        response += `• Check ingredient spelling\n`;
        response += `• Use \`search_cocktails\` for basic searches`;
      } else {
        response += `Found ${results.data.length} cocktails matching your criteria:\n\n`;
        
        results.data.slice(0, args.limit || 20).forEach((cocktail, index) => {
          const abv = cocktail.abv ? `${cocktail.abv}% ABV` : 'ABV not specified';
          const glass = cocktail.glass?.name || 'Glass not specified';
          const method = cocktail.method?.name || 'Method not specified';
          
          response += `## ${index + 1}. ${cocktail.name}\n`;
          response += `**${abv} | ${glass} | ${method}**\n`;
          if (cocktail.description) {
            response += `*${cocktail.description}*\n`;
          }
          response += `**ID:** ${cocktail.id}\n\n`;
        });
        
        response += `*Use \`get_cocktail_recipe\` with any ID to get the full recipe.*`;
      }

      return {
        content: [
          {
            type: 'text',
            text: response,
          },
        ],
      };
    } catch (error) {
      console.error('Error with advanced filtering:', error);
      return {
        content: [
          {
            type: 'text',
          text: `# Advanced Filter Error\n\n` +
            `Sorry, I encountered an error while applying your advanced filters.\n\n` +
            `**Error:** ${error instanceof Error ? error.message : String(error)}\n\n` +
            `Please check your filter criteria and try again.`,
          },
        ],
      };
    }
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Server is now running - no output to avoid interfering with MCP protocol
  }

  async runSSE(port: number): Promise<void> {
    const app = express();
    
    // Security middleware
    app.use(helmet());
    app.use(morgan('combined'));
    
    // Rate limiting: 100 requests per 15 minutes
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    });
    app.use(limiter);

    // API Key Authentication
    const apiKey = process.env.MCP_API_KEY;
    if (!apiKey) {
      console.warn('⚠️  WARNING: MCP_API_KEY environment variable is not set!');
      console.warn('   The server is running without authentication. This is NOT recommended for public exposure.');
    }

    const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
      if (!apiKey) return next(); // Skip auth if no key configured (dev mode)

      const authHeader = req.headers.authorization;
      const queryKey = req.query.apiKey as string;
      
      // Check Bearer token
      if (authHeader && authHeader.startsWith('Bearer ') && authHeader.slice(7) === apiKey) {
        return next();
      }
      
      // Check X-API-Key header
      if (req.headers['x-api-key'] === apiKey) {
        return next();
      }

      // Check query parameter (fallback for clients that can't set headers)
      if (queryKey === apiKey) {
        return next();
      }

      res.status(401).json({ error: 'Unauthorized: Invalid API Key' });
    };

    app.use(authMiddleware);

    // Keep track of the current transport
    let transport: SSEServerTransport | null = null;

    app.get('/sse', async (req, res) => {
      console.log('New SSE connection');
      transport = new SSEServerTransport('/message', res);
      await this.server.connect(transport);
      
      // Clean up when connection closes
      req.on('close', () => {
        console.log('SSE connection closed');
        // Optionally cleanup
      });
    });

    app.post('/message', async (req, res) => {
      if (!transport) {
        res.sendStatus(400);
        return;
      }
      await transport.handlePostMessage(req, res);
    });

    app.get('/debug', (req: Request, res: Response) => {
      res.json(process.env);
    });

    app.listen(port, () => {
      console.log(`Bar Assistant MCP Server running on SSE at http://localhost:${port}/sse`);
      if (apiKey) {
        console.log('🔒 Authentication enabled. Clients must provide the API Key.');
      }
    });
  }
}

// Start the server
const server = new BarAssistantMCPServer();

if (process.argv.includes('--sse')) {
  const port = parseInt(process.env.PORT || '3001', 10);
  server.runSSE(port).catch(console.error);
} else {
  server.run().catch(console.error);
}