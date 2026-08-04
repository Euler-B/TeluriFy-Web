import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';

export default defineConfig({
  integrations: [react()],
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: {
    optimizeDeps: {
      include: ['leaflet', 'react-leaflet', 'react-leaflet-cluster', 'react', 'react/jsx-runtime'],
    },
  },
});