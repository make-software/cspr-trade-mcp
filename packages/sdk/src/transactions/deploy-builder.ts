import casperSdk from 'casper-js-sdk';
import type { Args } from 'casper-js-sdk';
const { Deploy, DeployHeader, ExecutableDeployItem, StoredVersionedContractByHash, ContractHash, Hash, PublicKey } = casperSdk;
import type { NetworkConfig } from '../config.js';

export function buildWasmDeploy(params: {
  publicKey: string;
  paymentAmount: string;
  wasmBinary: Uint8Array;
  runtimeArgs: Args;
  networkConfig: NetworkConfig;
}): Deploy {
  const { publicKey, paymentAmount, wasmBinary, runtimeArgs, networkConfig } = params;

  const deployHeader = DeployHeader.default();
  deployHeader.chainName = networkConfig.chainName;
  deployHeader.account = PublicKey.fromHex(publicKey);
  deployHeader.gasPrice = networkConfig.gasPrice;

  const payment = ExecutableDeployItem.standardPayment(paymentAmount);
  const session = ExecutableDeployItem.newModuleBytes(wasmBinary, runtimeArgs);

  return Deploy.makeDeploy(deployHeader, payment, session);
}

export function buildContractCallDeploy(params: {
  publicKey: string;
  paymentAmount: string;
  contractPackageHash: string;
  entryPoint: string;
  runtimeArgs: Args;
  networkConfig: NetworkConfig;
}): Deploy {
  const { publicKey, paymentAmount, contractPackageHash, entryPoint, runtimeArgs, networkConfig } = params;

  const deployHeader = DeployHeader.default();
  deployHeader.chainName = networkConfig.chainName;
  deployHeader.account = PublicKey.fromHex(publicKey);
  deployHeader.gasPrice = networkConfig.gasPrice;

  const hash = contractPackageHash.replace('hash-', '');
  const contractHash = new ContractHash(Hash.fromHex(hash), '');

  const payment = ExecutableDeployItem.standardPayment(paymentAmount);

  const session = new ExecutableDeployItem();
  session.storedVersionedContractByHash = new StoredVersionedContractByHash(
    contractHash,
    entryPoint,
    runtimeArgs,
  );

  return Deploy.makeDeploy(deployHeader, payment, session);
}
