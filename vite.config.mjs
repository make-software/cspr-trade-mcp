import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  root: mode === 'test' ? repoRoot : path.resolve(repoRoot, 'packages/site'),
  test: {
    workspace: path.resolve(repoRoot, 'vitest.workspace.ts'),
  },
}));
