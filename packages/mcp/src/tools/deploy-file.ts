import { writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

const DEPLOY_DIR = tmpdir();

/** Write deploy JSON to a temp file, return the path. */
export async function writeDeployFile(deployJson: string): Promise<string> {
  const filePath = join(DEPLOY_DIR, `cspr-deploy-${randomUUID()}.json`);
  await writeFile(filePath, deployJson, 'utf8');
  return filePath;
}

/** Read deploy JSON from a file path or inline string. */
export async function readDeployJson(pathOrJson: string): Promise<string> {
  // If it looks like JSON (starts with { ), treat as inline
  const trimmed = pathOrJson.trimStart();
  if (trimmed.startsWith('{')) {
    return pathOrJson;
  }
  // Otherwise treat as file path
  return readFile(pathOrJson, 'utf8');
}
