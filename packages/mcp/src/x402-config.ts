export const CDP_FACILITATOR_URL = 'https://api.cdp.coinbase.com/platform/v2/x402';

export interface X402Config {
  enabled: boolean;
  payTo: string | null;
  facilitatorUrl: string;
}

const EVM_ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function resolveX402Config(env: NodeJS.ProcessEnv): X402Config {
  const enabled = env.CSPR_TRADE_X402_ENABLED === 'true' || env.CSPR_TRADE_X402_ENABLED === '1';
  const facilitatorUrl = env.CSPR_TRADE_CDP_FACILITATOR_URL?.trim() || CDP_FACILITATOR_URL;

  if (!enabled) {
    return { enabled: false, payTo: null, facilitatorUrl };
  }

  const payTo = env.CSPR_TRADE_X402_PAYTO?.trim();
  if (!payTo) {
    throw new Error('x402 payments enabled but CSPR_TRADE_X402_PAYTO is not set. Refusing to start rather than misroute funds.');
  }
  if (!EVM_ADDRESS_RE.test(payTo)) {
    throw new Error(`CSPR_TRADE_X402_PAYTO is invalid: "${payTo}" is not an EVM address.`);
  }

  return { enabled: true, payTo, facilitatorUrl };
}
