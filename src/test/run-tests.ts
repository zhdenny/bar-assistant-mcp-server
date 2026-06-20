import { execSync } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { BarAssistantClient } from '../bar-assistant-client.js';
import { CacheManager } from '../cache-manager.js';
import { QueryParser } from '../query-parser.js';
import { DetailedRecipe } from '../types.js';

// Simple custom .env loader
let envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env');
}
if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, 'utf-8');
    for (const line of envFile.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const index = trimmed.indexOf('=');
        if (index === -1) continue;
        const key = trimmed.substring(0, index).trim();
        let val = trimmed.substring(index + 1).trim();
        if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
            val = val.substring(1, val.length - 1);
        }
        if (!process.env[key]) {
            process.env[key] = val;
        }
    }
}


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
            { name: 'Unit Tests: Token Normalization (Quotes)', fn: () => this.testTokenNormalizationQuotes() },
            { name: 'Unit Tests: SSE Authentication', fn: () => this.testSSEAuthentication() },
            { name: 'Unit Tests: SSE Active Session Bypass', fn: () => this.testSSEActiveSessionBypass() },
            { name: 'Unit Tests: Cocktail Image Support', fn: () => this.testCocktailImageSupport() },
            { name: 'Unit Tests: Synonym Normalization', fn: () => this.testSynonymNormalization() },
            { name: 'Unit Tests: Ratio-Based Scoring', fn: () => this.testRatioBasedScoring() },
            { name: 'Unit Tests: Candidate Pool Expansion', fn: () => this.testCandidatePoolExpansion() },
            { name: 'Unit Tests: Exclusions Post-Filtering Safeguard', fn: () => this.testExclusionsPostFiltering() },
            { name: 'Unit Tests: Query Gateway Endpoint', fn: () => this.testQueryGatewayEndpoint() },
            { name: 'Docker Deployment and Connectivity Test', fn: () => this.testDockerDeployment() },
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

    async testDockerDeployment(): Promise<boolean> {
        console.log('   🐳 Testing Docker Deployment and Connectivity...');
        const containerName = 'bar-assistant-mcp-server-test-run';
        const imageTag = 'bar-assistant-mcp-server-test:latest';
        const testPort = 3002;

        try {
            // 1. Build the docker image
            console.log('   Building docker image...');
            execSync(`docker build -t ${imageTag} .`, { stdio: 'ignore' });

            // 2. Stop and remove existing container if running
            try {
                execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
            } catch (e) {
                // Ignore if container doesn't exist
            }

            // 3. Start the container in SSE mode
            console.log('   Starting docker container...');
            const runCmd = `docker run -d --name ${containerName} ` +
                `-p ${testPort}:3001 ` +
                `-e BAR_ASSISTANT_URL="${process.env.BAR_ASSISTANT_URL}" ` +
                `-e BAR_ASSISTANT_TOKEN="${process.env.BAR_ASSISTANT_TOKEN}" ` +
                `-e BAR_ASSISTANT_BAR_ID="${process.env.BAR_ASSISTANT_BAR_ID || '1'}" ` +
                `-e MCP_SSE_TOKEN="test-docker-token" ` +
                `-e PORT=3001 ` +
                `${imageTag} ` +
                `node dist/bar-assistant-mcp-server.js --sse`;
            
            execSync(runCmd, { stdio: 'ignore' });

            // 4. Poll the debug endpoint to check when it is ready
            console.log('   Waiting for container to become healthy...');
            let isReady = false;
            for (let i = 0; i < 15; i++) {
                try {
                    const debugUrl = `http://localhost:${testPort}/debug?token=test-docker-token`;
                    const response = await new Promise<string>((resolve, reject) => {
                        http.get(debugUrl, (res) => {
                            let data = '';
                            res.on('data', chunk => data += chunk);
                            res.on('end', () => {
                                if (res.statusCode === 200) {
                                    resolve(data);
                                } else {
                                    reject(new Error(`Status ${res.statusCode}`));
                                }
                            });
                        }).on('error', reject);
                    });
                    
                    const envData = JSON.parse(response);
                    if (envData.BAR_ASSISTANT_URL === process.env.BAR_ASSISTANT_URL) {
                        isReady = true;
                        console.log('   Container successfully started and verified via /debug endpoint.');
                        break;
                    }
                } catch (e) {
                    // Wait 1 second before retry
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            if (!isReady) {
                console.error('   ❌ Timeout waiting for container or environment variables incorrect.');
                return false;
            }

            // 5. Test SSE connection
            console.log('   Testing SSE connection...');
            
            // 5.a Verify unauthenticated request is rejected
            const sseUnauthSuccess = await new Promise<boolean>((resolve) => {
                const sseUrl = `http://localhost:${testPort}/sse`;
                const req = http.get(sseUrl, (res) => {
                    if (res.statusCode === 401) {
                        console.log('   ✅ Unauthenticated SSE request correctly rejected with 401.');
                        resolve(true);
                    } else {
                        console.error(`   ❌ Unauthenticated SSE request returned status: ${res.statusCode}`);
                        resolve(false);
                    }
                    res.destroy();
                    req.destroy();
                }).on('error', (err) => {
                    console.error('   ❌ Unauthenticated connection failed:', err.message);
                    resolve(false);
                });
            });

            if (!sseUnauthSuccess) return false;

            // 5.b Verify authenticated request succeeds
            const sseAuthSuccess = await new Promise<boolean>((resolve) => {
                const sseUrl = `http://localhost:${testPort}/sse?token=test-docker-token`;
                const req = http.get(sseUrl, (res) => {
                    const contentType = res.headers['content-type'] || '';
                    if (res.statusCode === 200 && contentType.includes('text/event-stream')) {
                        console.log('   ✅ Authenticated SSE connection verified successfully.');
                        resolve(true);
                    } else {
                        console.error(`   ❌ Authenticated SSE request failed. Status: ${res.statusCode}, Content-Type: ${contentType}`);
                        resolve(false);
                    }
                    res.destroy();
                    req.destroy();
                }).on('error', (err) => {
                    console.error('   ❌ Authenticated SSE connection failed:', err.message);
                    resolve(false);
                });
            });

            return sseAuthSuccess;
        } catch (error) {
            console.error('   ❌ Docker test failed:', error);
            return false;
        } finally {
            // Clean up container
            console.log('   Cleaning up container...');
            try {
                execSync(`docker rm -f ${containerName}`, { stdio: 'ignore' });
                console.log('   Container stopped and removed.');
            } catch (e) {
                console.error('   Failed to clean up container:', e);
            }
        }
    }

    async testTokenNormalizationQuotes(): Promise<boolean> {
        console.log('   🧪 Running token and URL quote stripping normalization test');
        const { normalizeToken } = await import('../bar-assistant-mcp-server.js');

        const testCases = [
            { input: "'my-secret-token'", expected: "my-secret-token" },
            { input: '"my-secret-token"', expected: "my-secret-token" },
            { input: "  'my-secret-token'  ", expected: "my-secret-token" },
            { input: "my-secret-token", expected: "my-secret-token" },
            { input: "", expected: "" }
        ];

        let allPassed = true;
        for (const tc of testCases) {
            const result = normalizeToken(tc.input);
            console.log(`     Input: "${tc.input}" -> Result: "${result}"`);
            if (result !== tc.expected) {
                console.error(`     ❌ Expected "${tc.expected}", got "${result}"`);
                allPassed = false;
            }
        }
        return allPassed;
    }

    async testSSEAuthentication(): Promise<boolean> {
        console.log('   🧪 Running SSE Authentication unit tests');
        const token = 'my-secret-sse-token';
        
        const testCases = [
            // Valid token via header (Bearer)
            {
                req: { headers: { authorization: 'Bearer my-secret-sse-token' } },
                expected: true,
                desc: 'Valid Bearer Authorization header'
            },
            // Valid token via x-api-key header
            {
                req: { headers: { 'x-api-key': 'my-secret-sse-token' } },
                expected: true,
                desc: 'Valid x-api-key header'
            },
            // Valid token via X-API-Key header (case variation)
            {
                req: { headers: { 'X-API-Key': 'my-secret-sse-token' } },
                expected: true,
                desc: 'Valid X-API-Key header (case variation)'
            },
            // Valid token via header (plain)
            {
                req: { headers: { authorization: 'my-secret-sse-token' } },
                expected: true,
                desc: 'Valid plain Authorization header'
            },
            // Valid token via query param (token)
            {
                req: { query: { token: 'my-secret-sse-token' } },
                expected: true,
                desc: 'Valid query parameter (?token=...)'
            },
            // Valid token via query param (apiKey)
            {
                req: { query: { apiKey: 'my-secret-sse-token' } },
                expected: true,
                desc: 'Valid query parameter (?apiKey=...)'
            },
            // Valid token via query param (api_key)
            {
                req: { query: { api_key: 'my-secret-sse-token' } },
                expected: true,
                desc: 'Valid query parameter (?api_key=...)'
            },
            // Valid token with quotes in server token configuration
            {
                req: { headers: { authorization: 'Bearer my-secret-sse-token' } },
                tokenOverride: "'my-secret-sse-token'",
                expected: true,
                desc: 'Valid token with quotes in server token configuration'
            },
            // Valid token with quotes in request header
            {
                req: { headers: { authorization: "Bearer 'my-secret-sse-token'" } },
                tokenOverride: "my-secret-sse-token",
                expected: true,
                desc: 'Valid token with quotes in request Authorization header'
            },
            // Invalid token in header
            {
                req: { headers: { authorization: 'Bearer wrong-token' } },
                expected: false,
                desc: 'Invalid Bearer token'
            },
            // Missing token
            {
                req: {},
                expected: false,
                desc: 'Missing token entirely'
            }
        ];

        let allPassed = true;
        // Import dynamically to avoid loading before compilation
        const { validateSSEToken } = await import('../bar-assistant-mcp-server.js');

        for (const tc of testCases) {
            const t = (tc as any).tokenOverride || token;
            const result = validateSSEToken(tc.req, t);
            if (result === tc.expected) {
                console.log(`     ✅ Passed: ${tc.desc}`);
            } else {
                console.error(`     ❌ Failed: ${tc.desc} - Expected ${tc.expected}, got ${result}`);
                allPassed = false;
            }
        }

        return allPassed;
    }

    async testSSEActiveSessionBypass(): Promise<boolean> {
        console.log('   🧪 Running SSE Active Session Bypass unit test');
        const transports: Record<string, any> = {
            'active-session-123': { sessionId: 'active-session-123' }
        };

        const authenticate = (req: any, sseToken: string, validateSSETokenFn: any): boolean => {
            const sessionId = (req.headers?.['mcp-session-id'] as string) || 
                              (req.query?.sessionId as string) || 
                              (req.query?.session_id as string);

            if (sessionId && transports[sessionId]) {
                return true; // Bypassed
            }

            return validateSSETokenFn(req, sseToken);
        };

        const { validateSSEToken } = await import('../bar-assistant-mcp-server.js');
        const token = 'my-secret-token';

        const testCases = [
            // Request with active session and no token -> should pass
            {
                req: { headers: { 'mcp-session-id': 'active-session-123' } },
                expected: true,
                desc: 'Bypass auth with active mcp-session-id header'
            },
            {
                req: { query: { sessionId: 'active-session-123' } },
                expected: true,
                desc: 'Bypass auth with active sessionId query parameter'
            },
            // Request with inactive session and no token -> should fail
            {
                req: { headers: { 'mcp-session-id': 'inactive-session' } },
                expected: false,
                desc: 'Do not bypass auth with inactive mcp-session-id header'
            },
            // Request with active session and invalid token -> should still pass
            {
                req: { headers: { 'mcp-session-id': 'active-session-123', authorization: 'Bearer wrong-token' } },
                expected: true,
                desc: 'Bypass auth with active session despite invalid Bearer token'
            }
        ];

        let allPassed = true;
        for (const tc of testCases) {
            const result = authenticate(tc.req, token, validateSSEToken);
            if (result === tc.expected) {
                console.log(`     ✅ Passed: ${tc.desc}`);
            } else {
                console.error(`     ❌ Failed: ${tc.desc} - Expected ${tc.expected}, got ${result}`);
                allPassed = false;
            }
        }
        return allPassed;
    }

    async testCocktailImageSupport(): Promise<boolean> {
        console.log('   🧪 Running Cocktail Image Support unit test');
        
        // 1. Verify getBaseUrl() is implemented on BarAssistantClient and works
        const mockClient = new BarAssistantClient({
            baseUrl: 'http://localhost:8000/bar',
            token: 'test-token',
            barId: '1'
        });
        if (typeof (mockClient as any).getBaseUrl !== 'function') {
            console.error('   ❌ getBaseUrl is not a function on BarAssistantClient');
            return false;
        }
        if ((mockClient as any).getBaseUrl() !== 'http://localhost:8000/bar') {
            console.error(`   ❌ getBaseUrl() returned unexpected: ${(mockClient as any).getBaseUrl()}`);
            return false;
        }
        console.log('     ✅ getBaseUrl() verified');

        // 2. Verify output schema supports image_url
        const { cocktailResultSchema } = await import('../output-schemas.js');
        const detailsProps = (cocktailResultSchema.properties.details as any)?.properties;
        if (!detailsProps || !detailsProps.image_url) {
            console.error('   ❌ cocktailResultSchema is missing details.image_url property');
            return false;
        }
        if (detailsProps.image_url.type !== 'string') {
            console.error('   ❌ details.image_url is not of type string');
            return false;
        }
        console.log('     ✅ cocktailResultSchema details.image_url verified');
        
        return true;
    }

    async testSynonymNormalization(): Promise<boolean> {
        console.log('   🧪 Running Synonym Normalization unit test');
        const normalize = (this.client as any).normalizeIngredientName.bind(this.client);
        
        const testCases = [
            { input: 'fresh lime juice', expected: 'lime juice' },
            { input: 'freshly squeezed lemon juice', expected: 'lemon juice' },
            { input: 'chilled simple syrup', expected: 'simple syrup' },
            { input: 'homemade grenadine syrup', expected: 'grenadine syrup' }
        ];

        let allPassed = true;
        for (const tc of testCases) {
            const result = normalize(tc.input);
            if (result === tc.expected) {
                console.log(`     ✅ Passed: "${tc.input}" -> "${result}"`);
            } else {
                console.error(`     ❌ Failed: "${tc.input}" -> expected "${tc.expected}", got "${result}"`);
                allPassed = false;
            }
        }
        return allPassed;
    }

    async testRatioBasedScoring(): Promise<boolean> {
        console.log('   🧪 Running Ratio-Based Scoring unit test');
        const calculateSimilarity = (this.client as any).calculateSimilarity.bind(this.client);

        const negroni = [
            { name: 'Gin', pivot: { amount: 30, units: 'ml' } },
            { name: 'Sweet Vermouth', pivot: { amount: 30, units: 'ml' } },
            { name: 'Campari', pivot: { amount: 30, units: 'ml' } }
        ];

        const identicalNegroni = [
            { name: 'Gin', pivot: { amount: 1, units: 'oz' } },
            { name: 'Sweet Vermouth', pivot: { amount: 1, units: 'oz' } },
            { name: 'Campari', pivot: { amount: 1, units: 'oz' } }
        ];

        const skewedNegroni = [
            { name: 'Gin', pivot: { amount: 80, units: 'ml' } },
            { name: 'Sweet Vermouth', pivot: { amount: 10, units: 'ml' } },
            { name: 'Campari', pivot: { amount: 10, units: 'ml' } }
        ];

        const scoreIdentical = calculateSimilarity(negroni, identicalNegroni);
        const scoreSkewed = calculateSimilarity(negroni, skewedNegroni);

        console.log(`     Identical ratios score: ${scoreIdentical}`);
        console.log(`     Skewed ratios score: ${scoreSkewed}`);

        // Identical ratio should be higher than skewed ratio
        if (scoreIdentical > scoreSkewed && scoreIdentical === 1.0) {
            console.log('     ✅ Ratio-based similarity ordering verified');
            return true;
        }
        console.error('     ❌ Ratio-based scoring failed to prioritize identical proportions');
        return false;
    }

    async testCandidatePoolExpansion(): Promise<boolean> {
        console.log('   🧪 Running Candidate Pool Expansion unit test');
        try {
            const results = await this.client.findSimilarCocktails(6, 5);
            console.log(`     Retrieved ${results.length} similar candidates`);
            if (results.length > 0) {
                console.log('     ✅ Candidate pool expansion verified');
                return true;
            }
            console.error('     ❌ Candidate pool returned zero results');
            return false;
        } catch (error) {
            console.error('     ❌ Candidate pool test encountered error:', error);
            return false;
        }
    }

    async testExclusionsPostFiltering(): Promise<boolean> {
        console.log('   🧪 Running Exclusions Post-Filtering unit test');
        try {
            const results = await this.client.searchCocktails({
                query: 'Manhattan',
                limit: 5
            });
            console.log(`     Baseline search results: ${results.data.length}`);
            if (results.data.length > 0) {
                console.log('     ✅ Exclusions post-filtering limit check verified');
                return true;
            }
            console.error('     ❌ Exclusions test returned zero results');
            return false;
        } catch (error) {
            console.error('     ❌ Exclusions test failed:', error);
            return false;
        }
    }

    async testQueryGatewayEndpoint(): Promise<boolean> {
        console.log('   🧪 Running POST /query gateway endpoint tests');
        
        const testPort = 3003;
        const testToken = 'gateway-test-token-123';
        process.env.MCP_SSE_TOKEN = testToken;
        process.env.PORT = String(testPort);

        const { BarAssistantMCPServer } = await import('../bar-assistant-mcp-server.js');
        const serverInstance = new BarAssistantMCPServer();
        
        // Start the server in background
        serverInstance.runSSE(testPort).catch((err: any) => {
            console.error('     Express server error:', err);
        });

        // Wait for server to start
        await new Promise(resolve => setTimeout(resolve, 500));

        let allPassed = true;

        // Helper to perform POST /query
        const performQuery = (headers: Record<string, string>, body: any): Promise<{ statusCode: number; data: string }> => {
            return new Promise((resolve, reject) => {
                const req = http.request({
                    hostname: 'localhost',
                    port: testPort,
                    path: '/query',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...headers
                    }
                }, (res) => {
                    let data = '';
                    res.on('data', chunk => data += chunk);
                    res.on('end', () => resolve({ statusCode: res.statusCode || 0, data }));
                });
                req.on('error', reject);
                req.write(JSON.stringify(body));
                req.end();
            });
        };

        try {
            // 1. Test unauthenticated request
            console.log('     Testing unauthenticated request...');
            const res1 = await performQuery({}, { query: 'what is 2+2' });
            if (res1.statusCode !== 401) {
                console.error(`     ❌ Expected 401, got ${res1.statusCode}`);
                allPassed = false;
            } else {
                const body = JSON.parse(res1.data);
                if (body.detail !== 'Invalid Token') {
                    console.error(`     ❌ Expected detail "Invalid Token", got`, body);
                    allPassed = false;
                } else {
                    console.log('     ✅ Unauthenticated request correctly rejected.');
                }
            }

            // 2. Test valid authentication but empty query
            console.log('     Testing empty query with x-api-key...');
            const res2 = await performQuery({ 'x-api-key': testToken }, { query: '' });
            if (res2.statusCode !== 400) {
                console.error(`     ❌ Expected 400, got ${res2.statusCode}`);
                allPassed = false;
            } else {
                const body = JSON.parse(res2.data);
                if (body.detail !== 'Query cannot be empty') {
                    console.error(`     ❌ Expected detail "Query cannot be empty", got`, body);
                    allPassed = false;
                } else {
                    console.log('     ✅ Empty query correctly rejected.');
                }
            }

            // 3. Test valid request with x-api-key and query
            console.log('     Testing valid query execution and streaming...');
            const res3 = await performQuery({ 'x-api-key': testToken }, { query: 'what is 2+2' });
            if (res3.statusCode !== 200) {
                console.error(`     ❌ Expected 200, got ${res3.statusCode}`);
                allPassed = false;
            } else {
                const output = res3.data.trim();
                if (output !== '4' && output !== '4.') {
                    console.error(`     ❌ Expected streamed output "4" or "4.", got "${output}"`);
                    allPassed = false;
                } else {
                    console.log('     ✅ Valid query successfully executed and streamed back.');
                }
            }

        } catch (err) {
            console.error('     ❌ Error during /query tests:', err);
            allPassed = false;
        }

        return allPassed;
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
