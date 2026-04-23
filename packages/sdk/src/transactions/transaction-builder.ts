import * as casperSdk from 'casper-js-sdk';
import type { Args as CasperArgs, Transaction as CasperTransaction } from 'casper-js-sdk';
import type { NetworkConfig } from '../config.js';

const { SessionBuilder, ContractCallBuilder, PublicKey } = casperSdk;

export function buildWasmTransaction(params: {
  publicKey: string;
  paymentAmount: string;
  wasmBinary: Uint8Array;
  runtimeArgs: CasperArgs;
  networkConfig: NetworkConfig;
}): CasperTransaction {
  const { publicKey, paymentAmount, wasmBinary, runtimeArgs, networkConfig } = params;
  return new SessionBuilder()
    .from(PublicKey.fromHex(publicKey))
    .wasm(wasmBinary)
    .installOrUpgrade()
    .runtimeArgs(runtimeArgs)
    .chainName(networkConfig.chainName)
    .payment(Number(paymentAmount))
    .ttl(networkConfig.ttl)
    .build();
}

export function buildContractCallTransaction(params: {
  publicKey: string;
  paymentAmount: string;
  contractPackageHash: string;
  entryPoint: string;
  runtimeArgs: CasperArgs;
  networkConfig: NetworkConfig;
}): CasperTransaction {
  const { publicKey, paymentAmount, contractPackageHash, entryPoint, runtimeArgs, networkConfig } = params;
  const hash = contractPackageHash.replace('hash-', '');
  return new ContractCallBuilder()
    .from(PublicKey.fromHex(publicKey))
    .byPackageHash(hash)
    .entryPoint(entryPoint)
    .runtimeArgs(runtimeArgs)
    .chainName(networkConfig.chainName)
    .payment(Number(paymentAmount))
    .ttl(networkConfig.ttl)
    .build();
}
