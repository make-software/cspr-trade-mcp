#!/usr/bin/env node
import { x402Client, x402HTTPClient } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { privateKeyToAccount } from 'viem/accounts';

const DEFAULT_MCP_URL = 'https://mcp.cspr.trade/mcp';
const DEFAULT_HEALTH_URL = 'https://mcp.cspr.trade/cdp-resource';

function env(name, fallback = undefined) {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function normalizePrivateKey(value) {
  if (!value) return null;
  return value.startsWith('0x') ? value : `0x${value}`;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

function buildMcpRequest() {
  return {
    jsonrpc: '2.0',
    id: `x402-settlement-ping-${Date.now()}`,
    method: 'tools/call',
    params: {
      name: 'get_quote',
      arguments: {
        token_in: 'CSPR',
        token_out: 'sCSPR',
        amount: env('CSPR_TRADE_X402_PING_AMOUNT', '1'),
        type: 'exact_in',
      },
    },
  };
}

async function dryRun() {
  const url = env('CSPR_TRADE_CDP_RESOURCE_URL', DEFAULT_HEALTH_URL);
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  const body = await readJson(response);
  const entries = body?.declareDiscoveryExtension ?? [];
  const premiumQuote = entries.find((entry) => entry.toolName === 'get_quote');
  return {
    mode: 'dry-run',
    url,
    status: response.status,
    ok: response.ok,
    toolCount: entries.length,
    getQuotePrice: premiumQuote?.price ?? null,
  };
}

async function settlementPing() {
  const privateKey = normalizePrivateKey(env('CSPR_TRADE_X402_PAYER_PRIVATE_KEY'));
  if (!privateKey) {
    throw new Error('CSPR_TRADE_X402_PAYER_PRIVATE_KEY is required for a paid settlement ping. Use --dry-run for a side-effect-free manifest check.');
  }

  const mcpUrl = env('CSPR_TRADE_MCP_URL', DEFAULT_MCP_URL);
  const account = privateKeyToAccount(privateKey);
  const coreClient = new x402Client();
  registerExactEvmScheme(coreClient, {
    signer: account,
    networks: ['eip155:8453'],
  });
  const httpClient = new x402HTTPClient(coreClient);

  const requestBody = buildMcpRequest();
  const first = await fetch(mcpUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(requestBody),
  });
  const firstBody = await readJson(first);

  if (first.status !== 402) {
    return {
      mode: 'paid',
      url: mcpUrl,
      status: first.status,
      settled: false,
      reason: 'expected initial 402 challenge',
      body: firstBody,
    };
  }

  const paymentRequired = httpClient.getPaymentRequiredResponse((name) => first.headers.get(name), firstBody);
  const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

  const paid = await fetch(mcpUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...paymentHeaders,
    },
    body: JSON.stringify(requestBody),
  });
  const paidBody = await readJson(paid);
  const paymentResult = await httpClient.processPaymentResult(paymentPayload, (name) => paid.headers.get(name), paid.status);

  return {
    mode: 'paid',
    url: mcpUrl,
    initialStatus: first.status,
    paidStatus: paid.status,
    settled: paymentResult.settleResponse?.success === true,
    settlement: paymentResult.settleResponse ?? null,
    body: paidBody,
  };
}

try {
  const result = process.argv.includes('--dry-run') ? await dryRun() : await settlementPing();
  console.log(JSON.stringify(result, null, 2));
  if (result.ok === false || result.settled === false) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 1;
}
