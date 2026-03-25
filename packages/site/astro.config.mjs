import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'static',
  redirects: {
    '/docs': '/docs/getting-started',
  },
  build: {
    format: 'directory',
  },
});
