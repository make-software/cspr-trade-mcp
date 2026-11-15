export const CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402';

export interface CdpCredentials {
  apiKeyId: string;
  apiKeySecret: string;
}

export interface X402Config {
  enabled: boolean;
  payTo: string | null;
  facilitatorUrl: string;
  /** CDP API key pair. Required when payments go through the Coinbase CDP facilitator. */
  cdpCredentials: CdpCredentials | null;
}

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function resolveX402Config(env: NodeJS.ProcessEnv): X402Config {
  const enabled = env.CSPR_TRADE_X402_ENABLED === 'true' || env.CSPR_TRADE_X402_ENABLED === '1';
  const facilitatorUrl = env.CSPR_TRADE_CDP_FACILITATOR_URL?.trim() || CDP_FACILITATOR_URL;

  if (!enabled) {
    return { enabled: false, payTo: null, facilitatorUrl, cdpCredentials: null };
  }

  const payTo = env.CSPR_TRADE_X402_PAYTO?.trim();
  if (!payTo) {
    throw new Error('x402 payments enabled but CSPR_TRADE_X402_PAYTO is not set. Refusing to start rather than misroute funds.');
  }
  if (!EVM_ADDRESS_RE.test(payTo)) {
    throw new Error(`CSPR_TRADE_X402_PAYTO is invalid: "${payTo}" is not an EVM address.`);
  }

  // The CDP facilitator rejects unauthenticated calls (401 on /supported), which
  // crashes startup later with a less helpful error. Fail here instead.
  let cdpCredentials: CdpCredentials | null = null;
  if (facilitatorUrl === CDP_FACILITATOR_URL) {
    const apiKeyId = env.CDP_API_KEY_ID?.trim();
    const apiKeySecret = env.CDP_API_KEY_SECRET?.trim();
    if (!apiKeyId || !apiKeySecret) {
      throw new Error('x402 payments use the Coinbase CDP facilitator, which needs CDP_API_KEY_ID and CDP_API_KEY_SECRET. Set both, or point CSPR_TRADE_CDP_FACILITATOR_URL at another facilitator.');
    }
    cdpCredentials = { apiKeyId, apiKeySecret };
  }

  return { enabled: true, payTo, facilitatorUrl, cdpCredentials };
}
