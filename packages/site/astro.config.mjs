import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import remarkHeadingIds from './src/content/remark-heading-ids.ts';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  output: 'static',
  build: {
    format: 'directory',
  },
  markdown: {
    remarkPlugins: [remarkHeadingIds],
    shikiConfig: {
      theme: 'github-dark-default',
    },
  },
});
