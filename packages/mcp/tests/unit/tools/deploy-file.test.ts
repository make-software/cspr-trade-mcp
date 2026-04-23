import { describe, it, expect, afterEach } from 'vitest';
import { readFile } from 'node:fs/promises';
import {
  ENABLE_FILE_DEPLOY_INPUT_ENV,
  formatDeployArtifact,
  readDeployJson,
  writeDeployFile,
} from '../../../src/tools/deploy-file.js';

afterEach(() => {
  delete process.env[ENABLE_FILE_DEPLOY_INPUT_ENV];
});

describe('deploy-file helpers', () => {
  it('returns inline JSON unchanged', async () => {
    const json = '{"hello":"world"}';

    await expect(readDeployJson(json)).resolves.toBe(json);
  });

  it('rejects file paths by default', async () => {
    const json = '{"deploy":"ok"}';
    const filePath = await writeDeployFile(json);

    await expect(readDeployJson(filePath)).rejects.toThrow(/disabled/i);
  });

  it('reads deploy JSON from generated temp files when file-path mode is enabled', async () => {
    process.env[ENABLE_FILE_DEPLOY_INPUT_ENV] = 'true';

    const json = '{"deploy":"ok"}';
    const filePath = await writeDeployFile(json);

    await expect(readDeployJson(filePath)).resolves.toBe(json);
    await expect(readFile(filePath, 'utf8')).resolves.toBe(json);
  });

  it('renders inline JSON artifacts by default', async () => {
    await expect(formatDeployArtifact('Signed transaction', '{"signed":true}')).resolves.toBe(
      'Signed transaction JSON:\n{"signed":true}',
    );
  });

  it('renders temp file artifacts when file-path mode is enabled', async () => {
    process.env[ENABLE_FILE_DEPLOY_INPUT_ENV] = '1';

    const text = await formatDeployArtifact('Signed transaction', '{"signed":true}');

    expect(text).toMatch(/^Signed transaction saved to: .*cspr-deploy-.*\.json$/);
  });

  it('rejects arbitrary file paths outside the generated deploy temp directory contract', async () => {
    process.env[ENABLE_FILE_DEPLOY_INPUT_ENV] = 'true';

    await expect(readDeployJson('/etc/hosts')).rejects.toThrow(/deploy file path/i);
  });
});
