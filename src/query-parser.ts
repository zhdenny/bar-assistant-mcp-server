/**
 * Natural Language Query Parser for Bar Assistant MCP Server
 * Extracts structured search parameters from natural language queries
 */

export interface ParsedQuery {
  strength?: 'light' | 'medium' | 'strong';
  flavors: string[];
  spirit?: string;
  glass?: string;
  excludes: string[];
  ingredients: string[];
  method?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  mood?: string;
  occasion?: string;
}

export class QueryParser {
  private static readonly patterns = {
    // Strength indicators
    strength: {
      light: /\b(light|weak|low[\s-]?alcohol|session|easy[\s-]?drinking|mild)\b/i,
      medium: /\b(medium|moderate|balanced|standard)\b/i,
      strong: /\b(strong|potent|boozy|high[\s-]?proof|stiff|powerful)\b/i
    },
    
    // Flavor profiles
    flavors: {
      bitter: /\b(bitter|amaro|campari|aperol|negroni[\s-]?like)\b/gi,
      sweet: /\b(sweet|dessert|candy|sugar|syrup|honey)\b/gi,
      sour: /\b(sour|tart|acidic|citrus|lime|lemon)\b/gi,
      dry: /\b(dry|bone[\s-]?dry|crisp|clean)\b/gi,
      herbal: /\b(herbal|botanical|green|earthy|sage|rosemary)\b/gi,
      fruity: /\b(fruity|tropical|berry|apple|pear|stone[\s-]?fruit)\b/gi,
      spicy: /\b(spicy|hot|pepper|ginger|cinnamon|warming)\b/gi,
      smoky: /\b(smoky|peated|mezcal|smokey|charred)\b/gi,
      refreshing: /\b(refreshing|cooling|crisp|bright|zesty)\b/gi,
      rich: /\b(rich|decadent|creamy|luxurious|indulgent)\b/gi
    },
    
    // Base spirits
    spirits: {
      gin: /\b(gin|juniper|botanical|london[\s-]?dry)\b/i,
      whiskey: /\b(whiskey|whisky|bourbon|rye|scotch|irish|japanese)\b/i,
      rum: /\b(rum|rhum|cachaca|sugarcane)\b/i,
      vodka: /\b(vodka|potato|grain[\s-]?spirit)\b/i,
      tequila: /\b(tequila|agave|mezcal|blanco|reposado)\b/i,
      brandy: /\b(brandy|cognac|armagnac|grape[\s-]?spirit)\b/i
    },
    
    // Glassware
    glass: {
      martini: /\b(martini|cocktail[\s-]?glass|up)\b/i,
      rocks: /\b(rocks|old[\s-]?fashioned|lowball|on[\s-]?the[\s-]?rocks)\b/i,
      coupe: /\b(coupe|champagne[\s-]?coupe)\b/i,
      highball: /\b(highball|collins|tall[\s-]?glass)\b/i,
      nick: /\b(nick[\s-]?and[\s-]?nora|small[\s-]?coupe)\b/i
    },
    
    // Methods
    methods: {
      shake: /\b(shake|shaken|vigorous)\b/i,
      stir: /\b(stir|stirred|gentle|elegant)\b/i,
      build: /\b(build|built|simple|easy)\b/i,
      muddle: /\b(muddle|muddled|crush|fresh)\b/i
    },
    
    // Exclusions
    exclude: /\b(without|no|avoid|except|not|skip|minus)\s+(\w+(?:\s+\w+)?)/gi,
    
    // Common ingredients
    ingredients: /\b(campari|aperol|vermouth|bitters|cointreau|triple[\s-]?sec|chartreuse|benedictine|maraschino|elderflower|st[\s-]?germain)\b/gi,
    
    // Difficulty
    difficulty: {
      easy: /\b(easy|simple|basic|quick|beginner)\b/i,
      medium: /\b(medium|intermediate|moderate)\b/i,
      hard: /\b(hard|complex|advanced|challenging|craft)\b/i
    },
    
    // Mood/Occasion
    mood: {
      romantic: /\b(romantic|date|intimate|elegant)\b/i,
      party: /\b(party|crowd|celebration|fun|festive)\b/i,
      relaxing: /\b(relaxing|chill|unwind|calm|peaceful)\b/i,
      sophisticated: /\b(sophisticated|classy|upscale|refined)\b/i
    },
    
    occasion: {
      dinner: /\b(dinner|meal|food|pairing)\b/i,
      brunch: /\b(brunch|morning|breakfast|daytime)\b/i,
      nightcap: /\b(nightcap|bedtime|digestif|after[\s-]?dinner)\b/i,
      summer: /\b(summer|hot|beach|poolside|warm[\s-]?weather)\b/i,
      winter: /\b(winter|cold|holiday|warming|cozy)\b/i
    }
  };

  static parse(query: string): ParsedQuery {
    const result: ParsedQuery = {
      flavors: [],
      excludes: [],
      ingredients: []
    };

    const lowerQuery = query.toLowerCase();

    // Extract strength
    for (const [strength, pattern] of Object.entries(this.patterns.strength)) {
      if (pattern.test(lowerQuery)) {
        result.strength = strength as 'light' | 'medium' | 'strong';
        break;
      }
    }

    // Extract flavors
    for (const [flavor, pattern] of Object.entries(this.patterns.flavors)) {
      const matches = query.match(pattern);
      if (matches) {
        result.flavors.push(flavor);
      }
    }

    // Extract base spirit
    for (const [spirit, pattern] of Object.entries(this.patterns.spirits)) {
      if (pattern.test(lowerQuery)) {
        result.spirit = spirit;
        break;
      }
    }

    // Extract glass preference
    for (const [glass, pattern] of Object.entries(this.patterns.glass)) {
      if (pattern.test(lowerQuery)) {
        result.glass = glass;
        break;
      }
    }

    // Extract method preference
    for (const [method, pattern] of Object.entries(this.patterns.methods)) {
      if (pattern.test(lowerQuery)) {
        result.method = method;
        break;
      }
    }

    // Extract difficulty
    for (const [difficulty, pattern] of Object.entries(this.patterns.difficulty)) {
      if (pattern.test(lowerQuery)) {
        result.difficulty = difficulty as 'easy' | 'medium' | 'hard';
        break;
      }
    }

    // Extract mood
    for (const [mood, pattern] of Object.entries(this.patterns.mood)) {
      if (pattern.test(lowerQuery)) {
        result.mood = mood;
        break;
      }
    }

    // Extract occasion
    for (const [occasion, pattern] of Object.entries(this.patterns.occasion)) {
      if (pattern.test(lowerQuery)) {
        result.occasion = occasion;
        break;
      }
    }

    // Extract exclusions
    const excludeMatches = Array.from(query.matchAll(this.patterns.exclude));
    result.excludes = excludeMatches.map(match => match[2].toLowerCase());

    // Extract specific ingredients
    const ingredientMatches = query.match(this.patterns.ingredients);
    if (ingredientMatches) {
      result.ingredients = ingredientMatches.map(ing => ing.toLowerCase().replace(/[\s-]+/g, ' '));
    }

    return result;
  }

  static enhanceSearchArgs(args: any, parsedQuery: ParsedQuery): any {
    const enhanced = { ...args };

    // Apply strength preference
    if (parsedQuery.strength && !args.preferred_strength) {
      enhanced.preferred_strength = parsedQuery.strength;
    }

    // Apply flavor preferences
    if (parsedQuery.flavors.length > 0 && !args.preferred_flavors) {
      enhanced.preferred_flavors = parsedQuery.flavors;
    }

    // Add ingredients to must_include
    if (parsedQuery.ingredients.length > 0) {
      enhanced.must_include = Array.from(new Set([
        ...(args.must_include || []),
        ...parsedQuery.ingredients
      ]));
    }

    // Add exclusions
    if (parsedQuery.excludes.length > 0) {
      enhanced.must_exclude = Array.from(new Set([
        ...(args.must_exclude || []),
        ...parsedQuery.excludes
      ]));
    }

    // Apply glass preference
    if (parsedQuery.glass && !args.glass_type) {
      enhanced.glass_type = parsedQuery.glass;
    }

    // Apply method preference
    if (parsedQuery.method && !args.preparation_method) {
      enhanced.preparation_method = parsedQuery.method;
    }

    return enhanced;
  }
}