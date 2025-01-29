import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';

const dirname = fileURLToPath(new URL('.', import.meta.url));

const root = resolve(dirname, 'src');
const outDir = resolve(dirname, 'dist');

export default defineConfig({
  appType: 'mpa',
  root,
  esbuild: {
    target: 'es2022',
  },
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2022',
    minify: true,
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3322',
      },
    },
  },
  vercel: {
    rewrites: [
      {
        source: '/api/:path*',
        destination: `${process.env.API_URL}:path*`,
      },
    ],
  },
});
