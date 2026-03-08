import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let cachedWasm: Uint8Array | null = null;

export async function getProxyCallerWasm(): Promise<Uint8Array> {
  if (cachedWasm) return cachedWasm;

  const currentDir = dirname(fileURLToPath(import.meta.url));
  let buffer: Buffer;
  try {
    // Bundled: dist/index.js → dist/assets/proxy_caller.wasm
    buffer = await readFile(join(currentDir, 'assets', 'proxy_caller.wasm'));
  } catch {
    // Source: src/assets/index.ts → src/assets/proxy_caller.wasm
    buffer = await readFile(join(currentDir, 'proxy_caller.wasm'));
  }
  cachedWasm = new Uint8Array(buffer);
  return cachedWasm;
}
