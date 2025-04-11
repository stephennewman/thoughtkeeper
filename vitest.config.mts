import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths'; // Import the plugin

// Define alias based on tsconfig.json - No longer needed here
// const pathAliases = {
//   '@': './src',
// };

export default defineConfig({
  plugins: [tsconfigPaths()], // Use the plugin
  // resolve: { // The plugin handles alias resolution
  //   alias: pathAliases,
  // },
  test: {
    globals: true, // Makes describe, it, expect, etc. available globally
    environment: 'jsdom', // Use jsdom for simulating browser environment
    setupFiles: './vitest.setup.ts', // Path to setup file
    // You might want to add include/exclude patterns if needed
    // include: ['src/**/*.test.{ts,tsx}'],
  },
}); 