import { hexToBytes } from '@noble/hashes/utils';
import casperSdk from 'casper-js-sdk';
const { Args, CLTypeUInt8, CLValue } = casperSdk;

export interface ProxyWasmArgsParams {
  routerPackageHash: string;  // hex without 'hash-' prefix
  entryPoint: string;
  innerArgs: Args;
  attachedValue: string;       // motes as string
}

export function serializeInnerArgs(args: Args): Uint8Array {
  return args.toBytes();
}

export function buildProxyWasmArgs(params: ProxyWasmArgsParams): Args {
  const { routerPackageHash, entryPoint, innerArgs, attachedValue } = params;

  const rawArgsBytes = serializeInnerArgs(innerArgs);

  const argsBytes: CLValue[] = [];
  for (let i = 0; i < rawArgsBytes.length; i++) {
    argsBytes.push(CLValue.newCLUint8(rawArgsBytes[i]));
  }

  return Args.fromMap({
    package_hash: CLValue.newCLByteArray(hexToBytes(routerPackageHash)),
    entry_point: CLValue.newCLString(entryPoint),
    args: CLValue.newCLList(CLTypeUInt8, argsBytes),
    attached_value: CLValue.newCLUInt512(attachedValue),
    amount: CLValue.newCLUInt512(attachedValue),
  });
}
