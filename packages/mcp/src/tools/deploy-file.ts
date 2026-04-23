import { writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename, dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const DEPLOY_DIR = resolve(tmpdir());
const DEPLOY_FILE_PREFIX = 'cspr-deploy-';
const DEPLOY_FILE_SUFFIX = '.json';
export const ENABLE_FILE_DEPLOY_INPUT_ENV = 'CSPR_TRADE_ENABLE_FILE_DEPLOY_INPUT';

function isTruthyEnv(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
}

export function isDeployFileInputEnabled(): boolean {
  return isTruthyEnv(process.env[ENABLE_FILE_DEPLOY_INPUT_ENV]);
}

export function getDeployInputDescription(kind: 'signed' | 'unsigned'): string {
  const base = kind === 'signed'
    ? 'The signed deploy JSON string'
    : 'Unsigned deploy JSON string';
  return `${base}. File paths are disabled by default and only allowed when ${ENABLE_FILE_DEPLOY_INPUT_ENV}=true.`;
}

export async function formatDeployArtifact(label: string, deployJson: string): Promise<string> {
  if (isDeployFileInputEnabled()) {
    const filePath = await writeDeployFile(deployJson);
    return `${label} saved to: ${filePath}`;
  }

  return `${label} JSON:\n${deployJson}`;
}

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

  if (!isDeployFileInputEnabled()) {
    throw new Error(
      `Deploy file paths are disabled. Pass inline JSON or set ${ENABLE_FILE_DEPLOY_INPUT_ENV}=true for local installs that need file-path workflow.`,
    );
  }

  const resolvedPath = resolve(pathOrJson);
  const isGeneratedDeployFile =
    dirname(resolvedPath) === DEPLOY_DIR
    && basename(resolvedPath).startsWith(DEPLOY_FILE_PREFIX)
    && basename(resolvedPath).endsWith(DEPLOY_FILE_SUFFIX);

  if (!isGeneratedDeployFile) {
    throw new Error(
      `Invalid deploy file path. Only generated deploy files in ${DEPLOY_DIR} named ${DEPLOY_FILE_PREFIX}*${DEPLOY_FILE_SUFFIX} are allowed.`,
    );
  }

  return readFile(resolvedPath, 'utf8');
}
