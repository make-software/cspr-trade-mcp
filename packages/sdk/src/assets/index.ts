import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let cachedWasm: Uint8Array | null = null;

export async function getProxyCallerWasm(): Promise<Uint8Array> {
  if (cachedWasm) return cachedWasm;

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const wasmPath = join(currentDir, 'proxy_caller.wasm');
  const buffer = await readFile(wasmPath);
  cachedWasm = new Uint8Array(buffer);
  return cachedWasm;
}
