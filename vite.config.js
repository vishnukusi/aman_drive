import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build can be hosted from any sub-path or opened from a static host.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
});
