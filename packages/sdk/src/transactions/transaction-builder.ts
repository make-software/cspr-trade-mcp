import casperSdk from 'casper-js-sdk';
import type { Args, Transaction } from 'casper-js-sdk';
import type { NetworkConfig } from '../config.js';

const { SessionBuilder, ContractCallBuilder, PublicKey } = casperSdk;

export function buildWasmTransaction(params: {
  publicKey: string;
  paymentAmount: string;
  wasmBinary: Uint8Array;
  runtimeArgs: Args;
  networkConfig: NetworkConfig;
}): Transaction {
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
  runtimeArgs: Args;
  networkConfig: NetworkConfig;
}): Transaction {
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
