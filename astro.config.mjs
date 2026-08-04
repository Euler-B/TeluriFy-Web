import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: vercel(),
  vite: {
    optimizeDeps: {
      include: ['leaflet', 'react-leaflet', 'react-leaflet-cluster', 'react', 'react/jsx-runtime'],
    },
  },
});