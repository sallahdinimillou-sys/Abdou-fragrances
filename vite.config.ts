import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

function devApiPlugin() {
  return {
    name: 'dev-api-middleware',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        const url = new URL(req.url, 'http://localhost');
        if (url.pathname === '/api/catalog') {
          try {
            const { default: handler } = await import('./api/catalog.ts');
            res.status = (code: number) => { res.statusCode = code; return res; };
            res.json = (data: any) => {
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify(data));
              return res;
            };
            req.query = Object.fromEntries(url.searchParams);
            await handler(req, res);
            return;
          } catch (e: any) {
            console.error('Dev /api/catalog error:', e);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
            return;
          }
        }
        if (url.pathname === '/api/image') {
          try {
            const { default: handler } = await import('./api/image.ts');
            res.status = (code: number) => { res.statusCode = code; return res; };
            res.send = (data: any) => {
              res.end(data);
              return res;
            };
            res.redirect = (a: any, b?: any) => {
              const statusCode = typeof a === 'number' ? a : 302;
              const redirectUrl = typeof a === 'string' ? a : b;
              res.writeHead(statusCode, { Location: redirectUrl });
              res.end();
              return res;
            };
            req.query = Object.fromEntries(url.searchParams);
            await handler(req, res);
            return;
          } catch (e: any) {
            console.error('Dev /api/image error:', e);
            res.statusCode = 500;
            res.end('Error loading image');
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), devApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname || process.cwd(), '.'),
      },
    },
    build: {
      target: ['es2020', 'safari14'],
      cssCodeSplit: true,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('firebase')) {
              return 'firebase-bundle';
            }
            if (id.includes('node_modules/lucide-react')) {
              return 'icons-vendor';
            }
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
              return 'react-vendor';
            }
          }
        }
      }
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
