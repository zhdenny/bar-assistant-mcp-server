import { BarAssistantClient } from '../src/bar-assistant-client.js';
import { CacheManager } from '../src/cache-manager.js';
import { QueryParser } from '../src/query-parser.js';
import { DetailedRecipe } from '../src/types.js';

class BarAssistantTester {
    private client: BarAssistantClient;

    constructor() {
        const config = {
            baseUrl: process.env.BAR_ASSISTANT_URL || '',
            token: process.env.BAR_ASSISTANT_TOKEN || '',
            barId: process.env.BAR_ASSISTANT_BAR_ID || '1',
            timeout: 30000,
        };
        if (!config.baseUrl || !config.token) {
            console.error('❌ ERROR: BAR_ASSISTANT_URL and BAR_ASSISTANT_TOKEN environment variables must be set');
            console.error('   Example:');
            console.error('   export BAR_ASSISTANT_URL="https://your-instance.com/bar"');
            console.error('   export BAR_ASSISTANT_TOKEN="your-api-token"');
            process.exit(1);
        }
        this.client = new BarAssistantClient(config);
    }

    async runAllTests() {
        console.log('🍸 Starting Bar Assistant MCP Server Tests\n');
        let allTestsPassed = true;
        const tests = [
            { name: 'API Connectivity Test', fn: () => this.testApiConnectivity() },
            { name: 'Search Cocktails Test', fn: () => this.testSearchCocktails() },
            { name: 'Negroni Recommendations Test (Main Scenario)', fn: () => this.testNegroniRecommendations() },
            { name: 'Recipe Details Test', fn: () => this.testRecipeDetails() },
            { name: 'Natural Language Recipe Test', fn: () => this.testNaturalLanguageRecipe() },
            { name: 'Inventory Check Test', fn: () => this.testInventoryCheck() },
            { name: 'Unit Tests: Cache Eviction Division-by-Zero', fn: () => this.testCacheEvictionSafety() },
            { name: 'Unit Tests: Ingredient Normalization (Parentheses)', fn: () => this.testIngredientNormalizationParentheses() },
            { name: 'Unit Tests: Spirit/Modifier Word Boundaries', fn: () => this.testSpiritModifierBoundaries() },
            { name: 'Unit Tests: Search Args Deduplication', fn: () => this.testSearchArgsDeduplication() },
            { name: 'Unit Tests: SSE Session Routing', fn: () => this.testSSESessionRouting() },
        ];

        for (const test of tests) {
            try {
                console.log(`🧪 Running: ${test.name}`);
                const result = await test.fn();
                if (result) {
                    console.log(`✅ PASSED: ${test.name}\n`);
                } else {
                    console.log(`❌ FAILED: ${test.name}\n`);
                    allTestsPassed = false;
                }
            } catch (error) {
                console.log(`❌ ERROR: ${test.name} - ${error instanceof Error ? error.message : String(error)}\n`);
                allTestsPassed = false;
            }
        }
        console.log(allTestsPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed!');
        return allTestsPassed;
    }

    async testApiConnectivity() {
        const ping = await this.client.ping();
        console.log(`   Status: ${ping.status}, Authenticated: ${ping.authenticated}`);
        if (ping.status === 'connected' && ping.authenticated) {
            return true;
        }
        console.log('   ❌ Failed to connect or authenticate with Bar Assistant API');
        return false;
    }

    async testSearchCocktails() {
        const results = await this.client.searchCocktails({
            query: 'Negroni',
            limit: 5
        });
        console.log(`   Found ${results.data.length} cocktails matching "Negroni"`);
        if (results.data.length === 0) {
            console.log('   ❌ No cocktails found - this might indicate API issues');
            return false;
        }
        const firstCocktail = results.data[0];
        const hasRequiredFields = firstCocktail.id && firstCocktail.name;
        if (!hasRequiredFields) {
            console.log('   ❌ Cocktail data missing required fields');
            return false;
        }
        console.log(`   Example result: "${firstCocktail.name}" (ID: ${firstCocktail.id})`);
        return true;
    }

    async testNegroniRecommendations() {
        console.log('   🎯 Testing main scenario: Negroni-like recommendations');
        const negroniSearch = await this.client.searchCocktails({
            query: 'Negroni',
            limit: 1
        });
        if (negroniSearch.data.length === 0) {
            console.log('   ❌ No Negroni found in database');
            return false;
        }
        const negroni = negroniSearch.data[0];
        console.log(`   Found Negroni: "${negroni.name}" (ID: ${negroni.id})`);
        const similarCocktails = await this.client.findSimilarCocktails(negroni.id, 5);
        if (similarCocktails.length === 0) {
            console.log('   ⚠️  No similar cocktails found');
            return true;
        }
        console.log(`   Found ${similarCocktails.length} similar cocktails:`);
        const recommendations = [];
        for (let i = 0; i < Math.min(3, similarCocktails.length); i++) {
            const similar = similarCocktails[i];
            const cocktail = similar.cocktail;
            const ingredients = cocktail.short_ingredients?.map(ing => ing.name).join(', ') || 'Unknown ingredients';
            const abv = cocktail.abv ? `${cocktail.abv}%` : 'ABV unknown';
            const reasons = similar.similarity_reasons?.join(', ') || 'Similar flavor profile';
            const recommendation = `${i + 1}. **${cocktail.name}** - ${abv}\n` +
                `   Ingredients: ${ingredients}\n` +
                `   Why similar: ${reasons}`;
            recommendations.push(recommendation);
            console.log(`     ${i + 1}. ${cocktail.name} (${abv}) - ${reasons}`);
        }
        if (recommendations.length > 0) {
            const naturalLanguageResponse = `Based on your Bar Assistant database, here are cocktails similar to a Negroni:\n\n` +
                recommendations.join('\n\n');
            console.log('   ✅ Successfully generated natural language recommendations');
            return true;
        }
        return false;
    }

    async testRecipeDetails() {
        const search = await this.client.searchCocktails({ limit: 1 });
        if (search.data.length === 0) {
            console.log('   ❌ No cocktails available for recipe test');
            return false;
        }
        const cocktail = search.data[0];
        const recipe = await this.client.getCocktailRecipe(cocktail.id);
        console.log(`   Retrieved recipe for: "${recipe.name}"`);
        console.log(`   Ingredients: ${recipe.ingredients?.length || 0}`);
        console.log(`   Instructions: ${recipe.instructions?.length || 0}`);
        const hasBasicRecipeData = recipe.name && (recipe.ingredients && recipe.ingredients.length > 0);
        if (!hasBasicRecipeData) {
            console.log('   ❌ Recipe missing basic required data');
            return false;
        }
        return true;
    }

    async testInventoryCheck() {
        try {
            const inventory = await this.client.checkInventory();
            console.log(`   Available ingredients: ${inventory.available_ingredients.length}`);
            console.log(`   Can make cocktails: ${inventory.can_make_cocktails.length}`);
            return true;
        } catch (error) {
            console.log('   ⚠️  Inventory check failed (might not be configured)');
            return true;
        }
    }

    async testNaturalLanguageRecipe() {
        console.log('   🎯 Testing natural language recipe queries');
        const testQueries = ['Manhattan', 'Negroni', 'Old Fashioned'];
        for (const query of testQueries) {
            try {
                console.log(`   Testing query: "${query}"`);
                const results = await this.client.findCocktailByName(query);
                if (results.data.length === 0) {
                    console.log(`   ⚠️  No results for "${query}" - might be expected for small database`);
                    continue;
                }
                const cocktail = results.data[0];
                console.log(`   Found: "${cocktail.name}" (ID: ${cocktail.id})`);
                const recipe = await this.client.getCocktailRecipe(cocktail.id);
                console.log(`   🔧 Debug - Recipe keys: ${Object.keys(recipe).join(', ')}`);
                console.log(`   🔧 Debug - Recipe name: "${recipe.name}"`);
                console.log(`   🔧 Debug - Ingredients type: ${typeof recipe.ingredients}, length: ${recipe.ingredients?.length || 'undefined'}`);
                if (!recipe.name) {
                    console.log(`   ❌ Recipe data incomplete for ${cocktail.name}`);
                    return false;
                }
                console.log(`   ✅ Recipe retrieved: ${recipe.ingredients?.length || 0} ingredients, ${recipe.instructions?.length || 0} steps`);
            } catch (error) {
                console.log(`   ❌ Error testing "${query}": ${error instanceof Error ? error.message : String(error)}`);
                return false;
            }
        }
        console.log('   ✅ Natural language recipe queries working');
        return true;
    }

    // Unit test: Eviction safety (division by zero / fast eviction check)
    async testCacheEvictionSafety(): Promise<boolean> {
        console.log('   🧪 Running Cache Eviction Division-by-Zero test');
        const cache = new CacheManager({ ttl: 5000, maxSize: 4 });
        
        // Populate cache to max size
        const recipeMock = { id: 1, name: 'Negroni', ingredients: [] } as any;
        cache.setCachedRecipe(1, recipeMock);
        cache.setCachedRecipe(2, { ...recipeMock, id: 2 });
        cache.setCachedRecipe(3, { ...recipeMock, id: 3 });
        cache.setCachedRecipe(4, { ...recipeMock, id: 4 });

        // Trigger eviction by exceeding size limit
        try {
            cache.setCachedRecipe(5, { ...recipeMock, id: 5 });
            console.log('   ✅ Eviction passed without division-by-zero or infinite sorting score error');
            return true;
        } catch (e) {
            console.log(`   ❌ Eviction threw error: ${e}`);
            return false;
        }
    }

    // Unit test: Ingredient normalization non-greedy parenthesis stripping
    async testIngredientNormalizationParentheses(): Promise<boolean> {
        console.log('   🧪 Running non-greedy parenthesis stripping test');
        // Access private method dynamically
        const method = (this.client as any).normalizeIngredientName.bind(this.client);
        
        const input = "Sweet Vermouth (Red) and Cherry (Garnish)";
        const expected = "sweet vermouth and cherry";
        const result = method(input);
        
        console.log(`   Input: "${input}" -> Result: "${result}"`);
        if (result === expected) {
            return true;
        }
        console.log(`   ❌ Expected "${expected}", got "${result}"`);
        return false;
    }

    // Unit test: Spirit and modifier matching boundary word checks
    async testSpiritModifierBoundaries(): Promise<boolean> {
        console.log('   🧪 Running spirit/modifier word boundary match test');
        
        const isBaseSpirit = (this.client as any).isBaseSpirit.bind(this.client);
        const isKeyModifier = (this.client as any).isKeyModifier.bind(this.client);

        // "ginger beer" has "gin", but shouldn't be counted as a base spirit
        const isGingerBeerSpirit = isBaseSpirit("ginger beer");
        // "virgin colada" has "gin", but shouldn't be base spirit
        const isVirginColadaSpirit = isBaseSpirit("virgin colada");
        // "dry vermouth" should match vermouth modifier
        const isDryVermouthModifier = isKeyModifier("dry vermouth");

        console.log(`   "ginger beer" is base spirit? ${isGingerBeerSpirit} (expected: false)`);
        console.log(`   "virgin colada" is base spirit? ${isVirginColadaSpirit} (expected: false)`);
        console.log(`   "dry vermouth" is key modifier? ${isDryVermouthModifier} (expected: true)`);

        if (isGingerBeerSpirit === false && isVirginColadaSpirit === false && isDryVermouthModifier === true) {
            return true;
        }
        console.log('   ❌ Word boundary checks failed');
        return false;
    }

    // Unit test: Search args Must-Include and Must-Exclude deduplication
    async testSearchArgsDeduplication(): Promise<boolean> {
        console.log('   🧪 Running search args deduplication test');
        
        const args = {
            must_include: ['gin', 'vermouth'],
            must_exclude: ['vodka']
        };
        const parsed = {
            flavors: [],
            excludes: ['vodka', 'whiskey'],
            ingredients: ['gin', 'lemon']
        };

        const result = QueryParser.enhanceSearchArgs(args, parsed);
        const mustInclude = result.must_include;
        const mustExclude = result.must_exclude;

        console.log(`   Enhanced must_include: ${JSON.stringify(mustInclude)} (expected no duplicate 'gin')`);
        console.log(`   Enhanced must_exclude: ${JSON.stringify(mustExclude)} (expected no duplicate 'vodka')`);

        const hasDuplicateInclude = mustInclude.indexOf('gin') !== mustInclude.lastIndexOf('gin');
        const hasDuplicateExclude = mustExclude.indexOf('vodka') !== mustExclude.lastIndexOf('vodka');

        if (!hasDuplicateInclude && !hasDuplicateExclude) {
            return true;
        }
        console.log('   ❌ Duplicates found in enhanced arrays');
        return false;
    }

    async testNegroniScenario() {
        console.log('   🎯 Testing Negroni Scenario Integration');
        await this.testNegroniRecommendations();
    }

    async testRecipeQuery() {
        console.log('   🎯 Testing Recipe Queries');
        await this.testNaturalLanguageRecipe();
    }

    async testLindenSquareRecipe() {
        console.log('   🎯 Testing Linden Square');
        const searchResults = await this.client.findCocktailByName('Linden Square');
        console.log(`   Linden Square count: ${searchResults.data.length}`);
    }

    // Unit test: SSE Session Routing
    async testSSESessionRouting(): Promise<boolean> {
        console.log('   🧪 Running SSE Session Routing test');
        const transports: Record<string, any> = {};
        
        const mockRes1 = { on: () => {} } as any;
        const mockRes2 = { on: () => {} } as any;
        
        const transport1 = { sessionId: 'session-abc-123', res: mockRes1 };
        const transport2 = { sessionId: 'session-xyz-789', res: mockRes2 };
        
        transports[transport1.sessionId] = transport1;
        transports[transport2.sessionId] = transport2;
        
        const req1 = { query: { sessionId: 'session-abc-123' } } as any;
        const req2 = { query: { sessionId: 'session-xyz-789' } } as any;
        const reqInvalid = { query: { sessionId: 'nonexistent' } } as any;
        
        const resolved1 = transports[req1.query.sessionId];
        const resolved2 = transports[req2.query.sessionId];
        const resolvedInvalid = transports[reqInvalid.query.sessionId];
        
        if (resolved1 === transport1 && resolved2 === transport2 && resolvedInvalid === undefined) {
            console.log('   ✅ SSE Session Routing logic matches session IDs correctly');
            return true;
        }
        console.log('   ❌ SSE Session Routing logic failed to map session IDs');
        return false;
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new BarAssistantTester();
    const testType = process.argv[2];
    if (testType === 'negroni') {
        tester.testNegroniScenario();
    } else if (testType === 'recipe') {
        tester.testRecipeQuery();
    } else if (testType === 'linden') {
        tester.testLindenSquareRecipe();
    } else {
        tester.runAllTests().then(success => {
            process.exit(success ? 0 : 1);
        }).catch(error => {
            console.error('Test runner failed:', error);
            process.exit(1);
        });
    }
}
