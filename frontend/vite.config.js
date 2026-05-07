import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';

export default defineConfig({
  plugins: [
    electron({
      main: {
        // Main process entry file
        entry: 'electron/main.js',
      },
    }),
  ],
});
