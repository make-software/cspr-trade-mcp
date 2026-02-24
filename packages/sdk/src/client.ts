import casperSdk from 'casper-js-sdk';
const { Deploy, PublicKey } = casperSdk;

import { HttpClient } from './api/http.js';
import { TokensApi } from './api/tokens.js';
import { PairsApi, type PairQuery, type PaginatedResult } from './api/pairs.js';
import { QuotesApi } from './api/quotes.js';
import { LiquidityApi } from './api/liquidity.js';
import { RatesApi } from './api/rates.js';
import { CurrenciesApi } from './api/currencies.js';
import { SwapsApi } from './api/swaps.js';
import { SubmissionApi } from './api/submission.js';
import { TokenResolver } from './resolver/token-resolver.js';
import { CurrencyResolver } from './resolver/currency-resolver.js';
import {
  getNetworkConfig,
  GAS_COSTS,
  DEFAULT_SLIPPAGE_BPS,
  DEFAULT_DEADLINE_MINUTES,
  CSPR_TOKEN_ID,
  ZERO_HASH,
  PRICE_IMPACT_WARNING_THRESHOLD,
  PRICE_IMPACT_HIGH_THRESHOLD,
  SLIPPAGE_WARNING_THRESHOLD,
  type NetworkConfig,
} from './config.js';
import { toRawAmount, toFormattedAmount, calculateMinWithSlippage, calculateMaxWithSlippage } from './utils/amounts.js';
import { getProxyCallerWasm } from './assets/index.js';
import { buildProxyWasmArgs } from './transactions/proxy-wasm.js';
import { getSwapEntryPoint, buildSwapInnerArgs, getSwapAttachedValue } from './transactions/swap.js';
import { buildAddLiquidityInnerArgs, buildRemoveLiquidityInnerArgs } from './transactions/liquidity.js';
import { buildApproveArgs } from './transactions/approve.js';
import { buildWasmDeploy, buildContractCallDeploy } from './transactions/deploy-builder.js';
import type {
  Token, Pair, Quote, QuoteParams, QuoteType, Currency,
  LiquidityPosition, LiquidityPositionApiResponse, ImpermanentLoss,
  SwapParams, ApprovalParams, AddLiquidityParams, RemoveLiquidityParams,
  TransactionBundle, SubmitResult, Signer,
  SwapHistoryQuery,
} from './types/index.js';

export interface CsprTradeClientConfig {
  network: 'mainnet' | 'testnet';
  apiUrl?: string;
  routerPackageHash?: string;
  wcsprPackageHash?: string;
  signer?: Signer;
}

export class CsprTradeClient {
  private readonly http: HttpClient;
  private readonly tokensApi: TokensApi;
  private readonly pairsApi: PairsApi;
  private readonly quotesApi: QuotesApi;
  private readonly liquidityApi: LiquidityApi;
  private readonly ratesApi: RatesApi;
  private readonly currenciesApi: CurrenciesApi;
  private readonly swapsApi: SwapsApi;
  private readonly submissionApi: SubmissionApi;
  private readonly tokenResolver: TokenResolver;
  private readonly currencyResolver: CurrencyResolver;
  private readonly networkConfig: NetworkConfig;
  private readonly signer?: Signer;

  constructor(config: CsprTradeClientConfig) {
    const baseConfig = getNetworkConfig(config.network);
    this.networkConfig = {
      ...baseConfig,
      apiUrl: config.apiUrl ?? baseConfig.apiUrl,
      routerPackageHash: config.routerPackageHash ?? baseConfig.routerPackageHash,
      wcsprPackageHash: config.wcsprPackageHash ?? baseConfig.wcsprPackageHash,
    };
    this.signer = config.signer;

    this.http = new HttpClient(this.networkConfig.apiUrl);
    this.tokensApi = new TokensApi(this.http);
    this.pairsApi = new PairsApi(this.http);
    this.quotesApi = new QuotesApi(this.http);
    this.liquidityApi = new LiquidityApi(this.http);
    this.ratesApi = new RatesApi(this.http);
    this.currenciesApi = new CurrenciesApi(this.http);
    this.swapsApi = new SwapsApi(this.http);
    this.submissionApi = new SubmissionApi(this.http);

    this.tokenResolver = new TokenResolver(() => this.tokensApi.getTokens());
    this.currencyResolver = new CurrencyResolver(() => this.currenciesApi.getCurrencies());
  }

  // --- Market Data ---

  async getTokens(currency?: string): Promise<Token[]> {
    const currencyId = currency ? await this.currencyResolver.resolveToId(currency) : undefined;
    return this.tokensApi.getTokens(currencyId);
  }

  async getPairs(opts?: PairQuery & { currency?: string }): Promise<PaginatedResult<Pair>> {
    const currencyId = opts?.currency ? await this.currencyResolver.resolveToId(opts.currency) : undefined;
    return this.pairsApi.getPairs({ ...opts, currencyId });
  }

  async getPairDetails(pairIdentifier: string, currency?: string): Promise<Pair> {
    const currencyId = currency ? await this.currencyResolver.resolveToId(currency) : undefined;
    return this.pairsApi.getPairDetails(pairIdentifier, currencyId);
  }

  async getQuote(params: QuoteParams): Promise<Quote> {
    const tokenIn = await this.tokenResolver.resolve(params.tokenIn);
    const tokenOut = await this.tokenResolver.resolve(params.tokenOut);

    const rawAmount = toRawAmount(params.amount, params.type === 'exact_in' ? tokenIn.decimals : tokenOut.decimals);

    const apiQuote = await this.quotesApi.getQuote({
      tokenIn: tokenIn.packageHash,
      tokenOut: tokenOut.packageHash,
      amount: rawAmount,
      typeId: params.type === 'exact_in' ? 1 : 2,
    });

    // Resolve path symbols
    const tokens = await this.tokenResolver.getTokens();
    const pathSymbols = apiQuote.path.map(hash => {
      const wcsprHash = this.networkConfig.wcsprPackageHash.replace('hash-', '');
      if (hash.replace('hash-', '') === wcsprHash) return 'CSPR';
      const t = tokens.find(tk => tk.packageHash.replace('hash-', '') === hash.replace('hash-', ''));
      return t?.symbol ?? hash.slice(0, 12) + '...';
    });

    return {
      amountIn: apiQuote.amount_in,
      amountOut: apiQuote.amount_out,
      amountInFormatted: toFormattedAmount(apiQuote.amount_in, tokenIn.decimals),
      amountOutFormatted: toFormattedAmount(apiQuote.amount_out, tokenOut.decimals),
      executionPrice: apiQuote.execution_price,
      midPrice: apiQuote.mid_price,
      path: apiQuote.path,
      pathSymbols,
      priceImpact: apiQuote.price_impact,
      recommendedSlippageBps: apiQuote.recommended_slippage_bps,
      type: params.type,
      tokenInSymbol: tokenIn.symbol,
      tokenOutSymbol: tokenOut.symbol,
      tokenInDecimals: tokenIn.decimals,
      tokenOutDecimals: tokenOut.decimals,
    };
  }

  async getCurrencies(): Promise<Currency[]> {
    return this.currenciesApi.getCurrencies();
  }

  // --- Account Data ---

  async getLiquidityPositions(publicKey: string, currency?: string): Promise<LiquidityPosition[]> {
    const currencyId = currency ? await this.currencyResolver.resolveToId(currency) : undefined;
    const raw = await this.liquidityApi.getPositions(publicKey, currencyId);
    return raw.map(mapLiquidityPosition);
  }

  async getImpermanentLoss(publicKey: string, pairHash: string): Promise<ImpermanentLoss> {
    const raw = await this.liquidityApi.getImpermanentLoss(publicKey, pairHash);
    return {
      pairContractPackageHash: raw.pair_contract_package_hash,
      value: raw.value,
      timestamp: raw.timestamp,
    };
  }

  async getSwapHistory(opts?: SwapHistoryQuery) {
    return this.swapsApi.getSwaps({
      senderAccountHash: opts?.accountHash,
      pairContractPackageHash: opts?.pairContractPackageHash,
      page: opts?.page,
      pageSize: opts?.pageSize,
    });
  }

  // --- Transaction Building ---

  async buildSwap(params: SwapParams): Promise<TransactionBundle> {
    const tokenIn = await this.tokenResolver.resolve(params.tokenIn);
    const tokenOut = await this.tokenResolver.resolve(params.tokenOut);

    // Fetch fresh quote
    const quote = await this.getQuote({
      tokenIn: params.tokenIn,
      tokenOut: params.tokenOut,
      amount: params.amount,
      type: params.type,
    });

    const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const deadlineMinutes = params.deadlineMinutes ?? DEFAULT_DEADLINE_MINUTES;
    const deadline = Date.now() + deadlineMinutes * 60 * 1000;

    const isFirstTokenNative = tokenIn.id === CSPR_TOKEN_ID;
    const isSecondTokenNative = tokenOut.id === CSPR_TOKEN_ID;

    const amountOutMin = calculateMinWithSlippage(quote.amountOut, slippageBps);
    const amountInMax = calculateMaxWithSlippage(quote.amountIn, slippageBps);

    const accountHash = PublicKey.fromHex(params.senderPublicKey).accountHash().toPrefixedString();

    // Build path with WCSPR substitution
    const wcsprHash = this.networkConfig.wcsprPackageHash;
    const path = quote.path.map(h => h.startsWith('hash-') ? h : `hash-${h}`);

    const entryPoint = getSwapEntryPoint(isFirstTokenNative, isSecondTokenNative, params.type);

    const innerArgs = buildSwapInnerArgs({
      isFirstTokenNative,
      isSecondTokenNative,
      quoteType: params.type,
      path,
      accountHash,
      deadline,
      amountIn: quote.amountIn,
      amountOut: quote.amountOut,
      amountInMax,
      amountOutMin,
    });

    const attachedValue = getSwapAttachedValue({
      isFirstTokenNative,
      quoteType: params.type,
      amountIn: quote.amountIn,
      amountInMax,
    });

    const routerHash = this.networkConfig.routerPackageHash.replace('hash-', '');
    const outerArgs = buildProxyWasmArgs({
      routerPackageHash: routerHash,
      entryPoint,
      innerArgs,
      attachedValue,
    });

    const wasmBinary = await getProxyCallerWasm();
    const isBothNotNative = !isFirstTokenNative && !isSecondTokenNative;
    const gasCost = isBothNotNative ? GAS_COSTS.swapTokenForToken : GAS_COSTS.swapCsprForToken;

    const deploy = buildWasmDeploy({
      publicKey: params.senderPublicKey,
      paymentAmount: gasCost.toString(),
      wasmBinary,
      runtimeArgs: outerArgs,
      networkConfig: this.networkConfig,
    });

    const warnings = buildWarnings(quote.priceImpact, slippageBps);

    const slippagePct = (slippageBps / 100).toFixed(2);
    const summary = [
      `Swap ${quote.amountInFormatted} ${tokenIn.symbol} for ~${quote.amountOutFormatted} ${tokenOut.symbol}`,
      `Route: ${quote.pathSymbols.join(' → ')}`,
      `Price impact: ${quote.priceImpact}%`,
      `Max slippage: ${slippagePct}%`,
      `Deadline: ${deadlineMinutes} minutes`,
      `Estimated gas: ${Number(gasCost) / 1_000_000_000} CSPR`,
    ].join('\n');

    return {
      deployJson: JSON.stringify(Deploy.toJSON(deploy)),
      summary,
      estimatedGasCost: `${Number(gasCost) / 1_000_000_000} CSPR`,
      warnings,
    };
  }

  async buildApproval(params: ApprovalParams): Promise<TransactionBundle> {
    const args = buildApproveArgs({
      spenderPackageHash: params.spenderPackageHash,
      amount: params.amount,
    });

    const deploy = buildContractCallDeploy({
      publicKey: params.senderPublicKey,
      paymentAmount: GAS_COSTS.approve.toString(),
      contractPackageHash: params.tokenContractPackageHash,
      entryPoint: 'approve',
      runtimeArgs: args,
      networkConfig: this.networkConfig,
    });

    return {
      deployJson: JSON.stringify(Deploy.toJSON(deploy)),
      summary: `Approve token spending for ${params.tokenContractPackageHash.slice(0, 16)}...`,
      estimatedGasCost: `${Number(GAS_COSTS.approve) / 1_000_000_000} CSPR`,
      warnings: [],
    };
  }

  async buildAddLiquidity(params: AddLiquidityParams): Promise<TransactionBundle> {
    const tokenA = await this.tokenResolver.resolve(params.tokenA);
    const tokenB = await this.tokenResolver.resolve(params.tokenB);

    const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const deadlineMinutes = params.deadlineMinutes ?? DEFAULT_DEADLINE_MINUTES;
    const deadline = Date.now() + deadlineMinutes * 60 * 1000;

    const isCSPRPair = tokenA.id === CSPR_TOKEN_ID || tokenB.id === CSPR_TOKEN_ID;
    const rawAmountA = toRawAmount(params.amountA, tokenA.decimals);
    const rawAmountB = toRawAmount(params.amountB, tokenB.decimals);
    const accountHash = PublicKey.fromHex(params.senderPublicKey).accountHash().toPrefixedString();

    let innerArgs;
    let entryPoint: string;
    let attachedValue = '0';

    if (isCSPRPair) {
      const csprToken = tokenA.id === CSPR_TOKEN_ID ? tokenA : tokenB;
      const otherToken = tokenA.id === CSPR_TOKEN_ID ? tokenB : tokenA;
      const motesAmount = tokenA.id === CSPR_TOKEN_ID ? rawAmountA : rawAmountB;
      const tokenAmount = tokenA.id === CSPR_TOKEN_ID ? rawAmountB : rawAmountA;

      innerArgs = buildAddLiquidityInnerArgs({
        isCSPRPair: true,
        tokenHash: otherToken.packageHash,
        amountTokenDesired: tokenAmount,
        amountTokenMin: calculateMinWithSlippage(tokenAmount, slippageBps),
        amountCSPRMin: calculateMinWithSlippage(motesAmount, slippageBps),
        accountHash,
        deadline,
      });
      entryPoint = 'add_liquidity_cspr';
      attachedValue = motesAmount;
    } else {
      // Sort tokens by package hash for consistency
      const [sortedA, sortedB, sortedAmountA, sortedAmountB] =
        tokenA.packageHash < tokenB.packageHash
          ? [tokenA, tokenB, rawAmountA, rawAmountB]
          : [tokenB, tokenA, rawAmountB, rawAmountA];

      innerArgs = buildAddLiquidityInnerArgs({
        isCSPRPair: false,
        tokenAHash: sortedA.packageHash,
        tokenBHash: sortedB.packageHash,
        amountADesired: sortedAmountA,
        amountBDesired: sortedAmountB,
        amountAMin: calculateMinWithSlippage(sortedAmountA, slippageBps),
        amountBMin: calculateMinWithSlippage(sortedAmountB, slippageBps),
        accountHash,
        deadline,
      });
      entryPoint = 'add_liquidity';
    }

    const routerHash = this.networkConfig.routerPackageHash.replace('hash-', '');
    const outerArgs = buildProxyWasmArgs({ routerPackageHash: routerHash, entryPoint, innerArgs, attachedValue });
    const wasmBinary = await getProxyCallerWasm();

    // Use higher gas for potentially new pools
    const gasCost = GAS_COSTS.addLiquidity; // caller can override if new pool

    const deploy = buildWasmDeploy({
      publicKey: params.senderPublicKey,
      paymentAmount: gasCost.toString(),
      wasmBinary,
      runtimeArgs: outerArgs,
      networkConfig: this.networkConfig,
    });

    const summary = [
      `Add liquidity: ${params.amountA} ${tokenA.symbol} + ${params.amountB} ${tokenB.symbol}`,
      `Slippage tolerance: ${(slippageBps / 100).toFixed(2)}%`,
      `Deadline: ${deadlineMinutes} minutes`,
      `Estimated gas: ${Number(gasCost) / 1_000_000_000} CSPR`,
    ].join('\n');

    return {
      deployJson: JSON.stringify(Deploy.toJSON(deploy)),
      summary,
      estimatedGasCost: `${Number(gasCost) / 1_000_000_000} CSPR`,
      warnings: [],
    };
  }

  async buildRemoveLiquidity(params: RemoveLiquidityParams): Promise<TransactionBundle> {
    // Fetch user's position to get LP balance and pair info
    const positions = await this.liquidityApi.getPositions(params.senderPublicKey);
    const position = positions.find(
      p => p.pair_contract_package_hash === params.pairContractPackageHash,
    );
    if (!position) {
      throw new Error(`No liquidity position found for pair ${params.pairContractPackageHash}`);
    }

    const slippageBps = params.slippageBps ?? DEFAULT_SLIPPAGE_BPS;
    const deadlineMinutes = params.deadlineMinutes ?? DEFAULT_DEADLINE_MINUTES;
    const deadline = Date.now() + deadlineMinutes * 60 * 1000;
    const accountHash = PublicKey.fromHex(params.senderPublicKey).accountHash().toPrefixedString();

    // Calculate LP amount to burn
    const lpBalance = BigInt(position.lp_token_balance);
    const lpToBurn = (lpBalance * BigInt(params.percentage)) / 100n;
    const lpTotalSupply = BigInt(position.pair_lp_tokens_total_supply);

    // Estimate token amounts
    const reserve0 = BigInt(position.pair.reserve0);
    const reserve1 = BigInt(position.pair.reserve1);
    const estAmount0 = (lpToBurn * reserve0 / lpTotalSupply).toString();
    const estAmount1 = (lpToBurn * reserve1 / lpTotalSupply).toString();

    const wcsprHash = this.networkConfig.wcsprPackageHash.replace('hash-', '');
    const isCSPRPair =
      position.pair.token0_contract_package_hash.replace('hash-', '') === wcsprHash ||
      position.pair.token1_contract_package_hash.replace('hash-', '') === wcsprHash;

    let innerArgs;
    let entryPoint: string;

    if (isCSPRPair) {
      const isToken0CSPR = position.pair.token0_contract_package_hash.replace('hash-', '') === wcsprHash;
      innerArgs = buildRemoveLiquidityInnerArgs({
        isCSPRPair: true,
        tokenHash: isToken0CSPR ? position.pair.token1_contract_package_hash : position.pair.token0_contract_package_hash,
        liquidity: lpToBurn.toString(),
        amountTokenMin: calculateMinWithSlippage(isToken0CSPR ? estAmount1 : estAmount0, slippageBps),
        amountCSPRMin: calculateMinWithSlippage(isToken0CSPR ? estAmount0 : estAmount1, slippageBps),
        accountHash,
        deadline,
      });
      entryPoint = 'remove_liquidity_cspr';
    } else {
      innerArgs = buildRemoveLiquidityInnerArgs({
        isCSPRPair: false,
        tokenAHash: position.pair.token0_contract_package_hash,
        tokenBHash: position.pair.token1_contract_package_hash,
        liquidity: lpToBurn.toString(),
        amountAMin: calculateMinWithSlippage(estAmount0, slippageBps),
        amountBMin: calculateMinWithSlippage(estAmount1, slippageBps),
        accountHash,
        deadline,
      });
      entryPoint = 'remove_liquidity';
    }

    const routerHash = this.networkConfig.routerPackageHash.replace('hash-', '');
    const outerArgs = buildProxyWasmArgs({ routerPackageHash: routerHash, entryPoint, innerArgs, attachedValue: '0' });
    const wasmBinary = await getProxyCallerWasm();

    const deploy = buildWasmDeploy({
      publicKey: params.senderPublicKey,
      paymentAmount: GAS_COSTS.removeLiquidity.toString(),
      wasmBinary,
      runtimeArgs: outerArgs,
      networkConfig: this.networkConfig,
    });

    const summary = [
      `Remove ${params.percentage}% liquidity from pair ${params.pairContractPackageHash.slice(0, 16)}...`,
      `LP tokens to burn: ${lpToBurn.toString()}`,
      `Estimated gas: ${Number(GAS_COSTS.removeLiquidity) / 1_000_000_000} CSPR`,
    ].join('\n');

    return {
      deployJson: JSON.stringify(Deploy.toJSON(deploy)),
      summary,
      estimatedGasCost: `${Number(GAS_COSTS.removeLiquidity) / 1_000_000_000} CSPR`,
      warnings: [],
    };
  }

  // --- Transaction Submission ---

  async submitTransaction(signedDeployJson: string): Promise<SubmitResult> {
    const parsed = JSON.parse(signedDeployJson);
    return this.submissionApi.submitTransaction(parsed);
  }

  // --- Token Resolution ---

  async resolveToken(identifier: string): Promise<Token> {
    return this.tokenResolver.resolve(identifier);
  }
}

function mapLiquidityPosition(raw: LiquidityPositionApiResponse): LiquidityPosition {
  const lpBalance = BigInt(raw.lp_token_balance);
  const totalSupply = BigInt(raw.pair_lp_tokens_total_supply);
  const reserve0 = BigInt(raw.pair.reserve0);
  const reserve1 = BigInt(raw.pair.reserve1);

  const poolShare = totalSupply > 0n
    ? ((lpBalance * 10000n) / totalSupply).toString()
    : '0';

  const estToken0 = totalSupply > 0n ? (lpBalance * reserve0 / totalSupply).toString() : '0';
  const estToken1 = totalSupply > 0n ? (lpBalance * reserve1 / totalSupply).toString() : '0';

  const meta0 = raw.pair.token0_contract_package?.metadata;
  const meta1 = raw.pair.token1_contract_package?.metadata;

  return {
    accountHash: raw.account_hash,
    pairContractPackageHash: raw.pair_contract_package_hash,
    lpTokenBalance: raw.lp_token_balance,
    lpTokenTotalSupply: raw.pair_lp_tokens_total_supply,
    pair: {
      token0Symbol: meta0?.symbol ?? '',
      token1Symbol: meta1?.symbol ?? '',
      token0PackageHash: raw.pair.token0_contract_package_hash,
      token1PackageHash: raw.pair.token1_contract_package_hash,
      reserve0: raw.pair.reserve0,
      reserve1: raw.pair.reserve1,
      decimals0: raw.pair.decimals0,
      decimals1: raw.pair.decimals1,
    },
    poolShare: (Number(poolShare) / 100).toFixed(2),
    estimatedToken0Amount: estToken0,
    estimatedToken1Amount: estToken1,
  };
}

function buildWarnings(priceImpact: string, slippageBps: number): string[] {
  const warnings: string[] = [];
  const impact = parseFloat(priceImpact);

  if (impact > PRICE_IMPACT_HIGH_THRESHOLD) {
    warnings.push(`HIGH PRICE IMPACT: ${priceImpact}% — you will lose a significant portion of your trade to price impact.`);
  } else if (impact > PRICE_IMPACT_WARNING_THRESHOLD) {
    warnings.push(`Price impact is ${priceImpact}% — consider trading a smaller amount.`);
  }

  if (slippageBps / 100 > SLIPPAGE_WARNING_THRESHOLD) {
    warnings.push(`High slippage tolerance: ${(slippageBps / 100).toFixed(2)}% — you may receive significantly less than quoted.`);
  }

  return warnings;
}
