import type { HTTPRequestContext, RoutesConfig } from '@x402/core/server';
import {
  bazaarResourceServerExtension,
  declareDiscoveryExtension,
} from '@x402/extensions/bazaar';

export { bazaarResourceServerExtension, declareDiscoveryExtension };

export const CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402';
export const X402_NETWORK = 'eip155:8453';
export const PREMIUM_PRICE_USDC = '0.001';

const PREMIUM_TOOLS = new Set([
  'get_quote',
  'estimate_price_impact',
  'estimate_slippage',
  'analyze_trade',
  'optimal_liquidity_amounts',
  'get_pair_price_history',
  'get_token_price_history',
  'get_impermanent_loss',
  'get_portfolio_value',
  'get_swap_history',
]);

export function priceFor(toolName: string): string {
  return PREMIUM_TOOLS.has(toolName) ? PREMIUM_PRICE_USDC : '0';
}

export function isPremiumToolName(toolName: string): boolean {
  return PREMIUM_TOOLS.has(toolName);
}

type McpRequestBody = {
  method?: unknown;
  params?: {
    name?: unknown;
  };
};

function getMcpRequestToolName(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;

  const request = body as McpRequestBody;
  if (request.method !== 'tools/call') return null;
  const toolName = request.params?.name;
  return typeof toolName === 'string' ? toolName : null;
}

export function getPremiumToolNamesFromMcpRequest(body: unknown): string[] {
  const requests = Array.isArray(body) ? body : [body];
  return requests
    .map(getMcpRequestToolName)
    .filter((toolName): toolName is string => toolName !== null && isPremiumToolName(toolName));
}

export function shouldRequireX402Payment(body: unknown): boolean {
  return getPremiumToolNamesFromMcpRequest(body).length > 0;
}

export function priceForMcpRequest(body: unknown): string {
  return shouldRequireX402Payment(body) ? `$${PREMIUM_PRICE_USDC}` : '$0';
}

export function priceForHTTPRequestContext(context: HTTPRequestContext): string {
  // @x402/express' real ExpressAdapter exposes req.body via getBody(); keep this
  // typed against @x402/core so premium MCP calls cannot silently drift to $0.
  return priceForMcpRequest(context.adapter.getBody?.());
}

const serviceName = 'CSPR.trade MCP Server';
const serviceDescription = 'AI-agent tools for CSPR.trade DEX operations on Casper mainnet: market data, quotes, swaps, liquidity, portfolio, and account analytics.';
const tags = ['casper', 'dex', 'mcp', 'x402'];

const publicKey = '01' + 'a'.repeat(64);
const pair = '5ddb20fed53ebf780b56ff8b6599411e907499644d2a5adb95555dfbba804dc2';
const token = 'sCSPR';

const objectSchema = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  ...(required.length > 0 ? { required } : {}),
});

const stringProp = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'string', description, ...extra });
const numberProp = (description: string, extra: Record<string, unknown> = {}) => ({ type: 'number', description, ...extra });

const jsonOutput = (example: unknown, schema: Record<string, unknown> = { type: 'object' }) => ({
  example,
  schema,
});

type ToolDiscoveryDefinition = {
  toolName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  example?: Record<string, unknown>;
  outputExample: unknown;
  outputSchema?: Record<string, unknown>;
};

export type BazaarManifestEntry = {
  name: string;
  route: 'POST /mcp';
  price: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  extensions: ReturnType<typeof declareDiscoveryExtension>;
};

export const toolDiscoveryDefinitions: ToolDiscoveryDefinition[] = [
  {
    toolName: 'get_tokens',
    description: 'List all tradable tokens on CSPR.trade with optional fiat pricing.',
    inputSchema: objectSchema({ currency: stringProp('Optional fiat currency code, e.g. USD or EUR.') }),
    example: { currency: 'USD' },
    outputExample: [{ symbol: 'CSPR', name: 'Casper', decimals: 9, fiatPrice: 0.035 }],
    outputSchema: { type: 'array', items: { type: 'object' } },
  },
  {
    toolName: 'get_pairs',
    description: 'List trading pairs on CSPR.trade with reserves and pricing data.',
    inputSchema: objectSchema({
      currency: stringProp('Optional fiat currency code for pricing.'),
      page: numberProp('Page number.'),
      page_size: numberProp('Items per page.'),
      order_by: stringProp('Sort field.', { enum: ['timestamp', 'reserve0', 'reserve1'] }),
      order_direction: stringProp('Sort direction.', { enum: ['asc', 'desc'] }),
    }),
    example: { currency: 'USD', page: 1, page_size: 10 },
    outputExample: { data: [], itemCount: 0, pageCount: 0 },
  },
  {
    toolName: 'get_pair_details',
    description: 'Get detailed reserves and token metadata for a specific trading pair.',
    inputSchema: objectSchema({ pair: stringProp('Pair contract package hash.'), currency: stringProp('Optional fiat currency code.') }, ['pair']),
    example: { pair, currency: 'USD' },
    outputExample: { contractPackageHash: pair, reserve0: '1000000000', reserve1: '990000000' },
  },
  {
    toolName: 'get_quote',
    description: 'Get a swap quote for trading between two tokens.',
    inputSchema: objectSchema({
      token_in: stringProp('Input token symbol, name, or contract hash.'),
      token_out: stringProp('Output token symbol, name, or contract hash.'),
      amount: stringProp('Human-readable amount.'),
      type: stringProp('Quote type.', { enum: ['exact_in', 'exact_out'] }),
    }, ['token_in', 'token_out', 'amount', 'type']),
    example: { token_in: 'CSPR', token_out: 'sCSPR', amount: '100', type: 'exact_in' },
    outputExample: { tokenInAmount: '100', tokenOutAmount: '98.5', route: ['CSPR', 'sCSPR'] },
  },
  {
    toolName: 'get_currencies',
    description: 'List supported fiat currencies for price display.',
    inputSchema: objectSchema({}),
    example: {},
    outputExample: [{ id: 1, code: 'USD', type_id: 1 }],
    outputSchema: { type: 'array', items: { type: 'object' } },
  },
  {
    toolName: 'get_pair_price_history',
    description: 'Get OHLCV candlestick price history for a specific trading pair.',
    inputSchema: objectSchema({
      pair: stringProp('Pair contract package hash.'),
      interval: stringProp('Candle interval.', { enum: ['1h', '4h', '1d'] }),
      limit: numberProp('Number of candles to return.'),
    }, ['pair']),
    example: { pair, interval: '1h', limit: 24 },
    outputExample: [{ timestamp: '2026-02-19T12:00:00.000Z', open: 1, high: 1, low: 1, close: 1, swapCount: 1 }],
    outputSchema: { type: 'array', items: { type: 'object' } },
  },
  {
    toolName: 'get_token_price_history',
    description: 'Get OHLCV candlestick price history for a token by symbol, name, or hash.',
    inputSchema: objectSchema({
      token: stringProp('Token symbol, name, or contract package hash.'),
      interval: stringProp('Candle interval.', { enum: ['1h', '4h', '1d'] }),
      limit: numberProp('Number of candles to return.'),
    }, ['token']),
    example: { token, interval: '1h', limit: 24 },
    outputExample: [{ timestamp: '2026-02-19T12:00:00.000Z', open: 1, high: 1, low: 1, close: 1, tradingPair: 'CSPR-sCSPR' }],
    outputSchema: { type: 'array', items: { type: 'object' } },
  },
  {
    toolName: 'build_swap',
    description: 'Build an unsigned swap transaction for external signing.',
    inputSchema: objectSchema({
      token_in: stringProp('Input token symbol, name, or contract hash.'),
      token_out: stringProp('Output token symbol, name, or contract hash.'),
      amount: stringProp('Human-readable amount.'),
      type: stringProp('Swap type.', { enum: ['exact_in', 'exact_out'] }),
      sender_public_key: stringProp('Sender Casper public key.'),
      deadline_minutes: numberProp('Transaction deadline in minutes.'),
      slippage_bps: numberProp('Slippage tolerance in basis points.'),
      token_in_balance: stringProp('Optional raw token balance for one-time approval.'),
    }, ['token_in', 'token_out', 'amount', 'type', 'sender_public_key']),
    example: { token_in: 'CSPR', token_out: 'sCSPR', amount: '100', type: 'exact_in', sender_public_key: publicKey, slippage_bps: 300 },
    outputExample: { summary: 'Swap 100 CSPR for sCSPR', deploy_json: '{...}' },
  },
  {
    toolName: 'build_approve_token',
    description: 'Build an unsigned CEP-18 token approval transaction.',
    inputSchema: objectSchema({
      token: stringProp('Token contract package hash to approve.'),
      amount: stringProp('Raw amount to approve.'),
      sender_public_key: stringProp('Sender Casper public key.'),
      spender: stringProp('Optional spender contract package hash.'),
    }, ['token', 'amount', 'sender_public_key']),
    example: { token, amount: '100000000000', sender_public_key: publicKey },
    outputExample: { summary: 'Approve token spending', deploy_json: '{...}' },
  },
  {
    toolName: 'submit_transaction',
    description: 'Submit a signed Casper transaction to node RPC.',
    inputSchema: objectSchema({ signed_deploy_json: stringProp('Signed deploy JSON string.') }, ['signed_deploy_json']),
    example: { signed_deploy_json: '{"deploy":{"hash":"..."}}' },
    outputExample: { transactionHash: 'b2601d8ce87f60ef09790266eefebf407e8a7dc543ba161b1437388836ec6d1d' },
  },
  {
    toolName: 'build_add_liquidity',
    description: 'Build an unsigned add-liquidity transaction for a token pair.',
    inputSchema: objectSchema({
      token_a: stringProp('First token symbol, name, or hash.'),
      token_b: stringProp('Second token symbol, name, or hash.'),
      amount_a: stringProp('Human-readable token A amount.'),
      amount_b: stringProp('Human-readable token B amount.'),
      sender_public_key: stringProp('Sender Casper public key.'),
      deadline_minutes: numberProp('Transaction deadline in minutes.'),
      slippage_bps: numberProp('Slippage tolerance in basis points.'),
      token_a_balance: stringProp('Optional raw token A balance for one-time approval.'),
      token_b_balance: stringProp('Optional raw token B balance for one-time approval.'),
    }, ['token_a', 'token_b', 'amount_a', 'amount_b', 'sender_public_key']),
    example: { token_a: 'CSPR', token_b: 'sCSPR', amount_a: '100', amount_b: '98', sender_public_key: publicKey },
    outputExample: { summary: 'Add liquidity', deploy_json: '{...}' },
  },
  {
    toolName: 'build_remove_liquidity',
    description: 'Build an unsigned remove-liquidity transaction.',
    inputSchema: objectSchema({
      pair: stringProp('Pair contract package hash.'),
      percentage: numberProp('Percentage of liquidity to remove, 1-100.'),
      sender_public_key: stringProp('Sender Casper public key.'),
      deadline_minutes: numberProp('Transaction deadline in minutes.'),
      slippage_bps: numberProp('Slippage tolerance in basis points.'),
    }, ['pair', 'percentage', 'sender_public_key']),
    example: { pair, percentage: 50, sender_public_key: publicKey },
    outputExample: { summary: 'Remove 50% liquidity', deploy_json: '{...}' },
  },
  {
    toolName: 'estimate_price_impact',
    description: 'Estimate the price impact of a swap before executing.',
    inputSchema: objectSchema({ token_in: stringProp('Input token.'), token_out: stringProp('Output token.'), amount: stringProp('Human-readable input amount.') }, ['token_in', 'token_out', 'amount']),
    example: { token_in: 'CSPR', token_out: 'sCSPR', amount: '1000' },
    outputExample: { priceImpactPct: 0.5, severity: 'low', spotPrice: '1.00', executionPrice: '0.995' },
  },
  {
    toolName: 'estimate_slippage',
    description: 'Estimate expected slippage and minimum output for a swap.',
    inputSchema: objectSchema({ token_in: stringProp('Input token.'), token_out: stringProp('Output token.'), amount: stringProp('Human-readable input amount.'), slippage_tolerance_bps: numberProp('Slippage tolerance in bps.') }, ['token_in', 'token_out', 'amount']),
    example: { token_in: 'CSPR', token_out: 'sCSPR', amount: '1000', slippage_tolerance_bps: 300 },
    outputExample: { expectedOutputFormatted: '985', minimumOutputFormatted: '955.45', recommendedSlippageBps: 300 },
  },
  {
    toolName: 'analyze_trade',
    description: 'Run combined price-impact, slippage, and recommendation analysis for a trade.',
    inputSchema: objectSchema({ token_in: stringProp('Input token.'), token_out: stringProp('Output token.'), amount: stringProp('Human-readable input amount.'), slippage_tolerance_bps: numberProp('Slippage tolerance in bps.') }, ['token_in', 'token_out', 'amount']),
    example: { token_in: 'CSPR', token_out: 'sCSPR', amount: '1000', slippage_tolerance_bps: 300 },
    outputExample: { recommendation: 'proceed', recommendationText: 'Trade looks acceptable.' },
  },
  {
    toolName: 'optimal_liquidity_amounts',
    description: 'Calculate optimal paired amount for adding liquidity while maintaining pool ratio.',
    inputSchema: objectSchema({ token_a: stringProp('First token.'), token_b: stringProp('Second token.'), amount_a: stringProp('Human-readable token A amount.') }, ['token_a', 'token_b', 'amount_a']),
    example: { token_a: 'CSPR', token_b: 'sCSPR', amount_a: '100' },
    outputExample: { amountA: '100', amountB: '98.5', estimatedPoolSharePct: 0.01 },
  },
  {
    toolName: 'get_native_cspr_balance',
    description: 'Get native CSPR balance for a Casper account.',
    inputSchema: objectSchema({ account_public_key: stringProp('Casper account public key.') }, ['account_public_key']),
    example: { account_public_key: publicKey },
    outputExample: { motes: '123456789000000000', cspr: '123.456789' },
  },
  {
    toolName: 'get_token_balance',
    description: 'Get CEP-18 token balances for a Casper account.',
    inputSchema: objectSchema({ account_public_key: stringProp('Casper account public key.'), token: stringProp('Optional token symbol, name, or contract package hash.') }, ['account_public_key']),
    example: { account_public_key: publicKey, token: 'sCSPR' },
    outputExample: [{ symbol: 'sCSPR', balance: '50000000000', formatted_balance: '50.0' }],
    outputSchema: { type: 'array', items: { type: 'object' } },
  },
  {
    toolName: 'get_liquidity_positions',
    description: 'Get liquidity positions for a Casper account.',
    inputSchema: objectSchema({ account_public_key: stringProp('Casper account public key.'), currency: stringProp('Optional fiat currency code.') }, ['account_public_key']),
    example: { account_public_key: publicKey, currency: 'USD' },
    outputExample: [{ pair_contract_package_hash: pair, liquidity_token_balance: '1000000000000000', fiat_value: 10.5 }],
    outputSchema: { type: 'array', items: { type: 'object' } },
  },
  {
    toolName: 'get_impermanent_loss',
    description: 'Calculate impermanent loss for a liquidity position.',
    inputSchema: objectSchema({ account_public_key: stringProp('Casper account public key.'), pair: stringProp('Pair contract package hash.') }, ['account_public_key', 'pair']),
    example: { account_public_key: publicKey, pair },
    outputExample: { impermanent_loss_percentage: -0.5 },
  },
  {
    toolName: 'get_swap_history',
    description: 'Get swap transaction history with optional account and pair filters.',
    inputSchema: objectSchema({
      public_key: stringProp('Optional sender public key filter.'),
      pair: stringProp('Optional pair contract package hash filter.'),
      page: numberProp('Page number.'),
      page_size: numberProp('Items per page.'),
    }),
    example: { public_key: publicKey, pair, page_size: 10 },
    outputExample: [{ deployHash: 'abc123', tokenInSymbol: 'CSPR', tokenOutSymbol: 'sCSPR', amountIn: '100', amountOut: '98' }],
    outputSchema: { type: 'array', items: { type: 'object' } },
  },
  {
    toolName: 'get_portfolio_value',
    description: 'Get total portfolio value across all liquidity positions for an account.',
    inputSchema: objectSchema({ account_public_key: stringProp('Casper account public key.'), currency: stringProp('Optional fiat currency code.') }, ['account_public_key']),
    example: { account_public_key: publicKey, currency: 'USD' },
    outputExample: { total_cspr_value: 250.75, total_fiat_value: 15.2, fiat_currency: 'USD' },
  },
  {
    toolName: 'get_position_status',
    description: 'Get current position status for liquidity positions.',
    inputSchema: objectSchema({ account_public_key: stringProp('Casper account public key.'), pair_contract_package_hash: stringProp('Optional pair contract package hash filter.') }, ['account_public_key']),
    example: { account_public_key: publicKey, pair_contract_package_hash: pair },
    outputExample: [{ pair_contract_package_hash: pair, token0_amount: '100', token1_amount: '98', impermanent_loss_percentage: -0.5 }],
    outputSchema: { type: 'array', items: { type: 'object' } },
  },
];

export const BAZAAR_MANIFEST_ENTRIES: BazaarManifestEntry[] = toolDiscoveryDefinitions.map((definition) => {
  const outputSchema = definition.outputSchema ?? { type: 'object' };
  const extensions = declareDiscoveryExtension({
    toolName: definition.toolName,
    description: definition.description,
    transport: 'streamable-http',
    inputSchema: definition.inputSchema,
    example: definition.example,
    output: jsonOutput(definition.outputExample, outputSchema),
  });

  return {
    name: definition.toolName,
    route: 'POST /mcp',
    price: priceFor(definition.toolName),
    description: definition.description,
    inputSchema: definition.inputSchema,
    outputSchema,
    extensions,
  };
});

export function getToolDiscoveryExtensions() {
  return BAZAAR_MANIFEST_ENTRIES.map((entry) => ({
    targetRoute: '/mcp',
    toolName: entry.name,
    description: entry.description,
    price: entry.price,
    extensions: entry.extensions,
  }));
}

export function getCdpResourceManifest(publicUrl = 'https://mcp.cspr.trade') {
  return {
    bazaarResourceServerExtension: {
      resourceName: serviceName,
      description: serviceDescription,
      pricing: 'x402 exact payments on Base USDC; default price is configurable and may be $0 for discovery testing.',
      supportedNetworks: ['casper-mainnet'],
      paymentNetwork: X402_NETWORK,
      resourceUrl: `${publicUrl.replace(/\/$/, '')}/mcp`,
      tags,
    },
    declareDiscoveryExtension: getToolDiscoveryExtensions(),
  };
}

export function getX402RoutesConfig(options: {
  publicUrl: string;
  payTo: string;
}): RoutesConfig {
  const publicUrl = options.publicUrl.replace(/\/$/, '');

  return {
    'POST /mcp': {
      accepts: {
        scheme: 'exact',
        network: X402_NETWORK,
        payTo: options.payTo,
        price: priceForHTTPRequestContext,
      },
      resource: `${publicUrl}/mcp`,
      description: serviceDescription,
      mimeType: 'application/json',
      serviceName,
      tags,
      extensions: declareDiscoveryExtension({
        toolName: 'cspr_trade_mcp_server',
        description: serviceDescription,
        transport: 'streamable-http',
        inputSchema: objectSchema({
          jsonrpc: stringProp('JSON-RPC version.'),
          method: stringProp('MCP method, such as tools/list or tools/call.'),
          params: { type: 'object', description: 'MCP request parameters.' },
        }, ['jsonrpc', 'method']),
        example: { jsonrpc: '2.0', method: 'tools/list', id: 1 },
        output: jsonOutput({ tools: toolDiscoveryDefinitions.map(({ toolName }) => ({ name: toolName })) }),
      }),
    },
  };
}
