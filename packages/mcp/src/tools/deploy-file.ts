import { writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const DEPLOY_DIR = tmpdir();

/**
 * When the server is reachable over HTTP, `signed_deploy_json` is untrusted input
 * from a remote caller — treating it as a filesystem path would let the caller ask
 * the server to read arbitrary files. File-path inputs are therefore only accepted
 * in stdio mode (local signer workflow).
 */
const HTTP_MODE = process.env.CSPR_TRADE_TRANSPORT === 'http';

/** Write deploy JSON to a temp file, return the path. */
export async function writeDeployFile(deployJson: string): Promise<string> {
  const filePath = join(DEPLOY_DIR, `cspr-deploy-${randomUUID()}.json`);
  await writeFile(filePath, deployJson, { encoding: 'utf8', mode: 0o600 });
  return filePath;
}

/** Read deploy JSON from a file path (stdio mode only) or inline JSON string. */
export async function readDeployJson(pathOrJson: string): Promise<string> {
  const trimmed = pathOrJson.trimStart();
  if (trimmed.startsWith('{')) {
    return pathOrJson;
  }
  if (HTTP_MODE) {
    throw new Error(
      'signed_deploy_json must be a JSON string. File-path inputs are only accepted in stdio mode.',
    );
  }
  return readFile(pathOrJson, 'utf8');
}
