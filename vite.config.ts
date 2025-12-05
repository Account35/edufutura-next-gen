import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Enable minification with terser for production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production', // Remove console.log in production
        drop_debugger: true,
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
      },
      mangle: {
        safari10: true, // Safari 10 compatibility
      },
    },
    // Enable tree shaking
    rollupOptions: {
      treeshake: true,
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          // UI library
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-accordion',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-toast',
          ],
          // Data fetching
          'data-vendor': ['@tanstack/react-query', '@supabase/supabase-js'],
          // Animation
          'animation-vendor': ['framer-motion'],
          // Charts (heavy - separate chunk)
          'charts-vendor': ['recharts'],
          // Forms
          'forms-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],
          // Date utilities
          'date-vendor': ['date-fns'],
          // Rich text editor (heavy - separate chunk)
          'editor-vendor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-link',
            '@tiptap/extension-image',
          ],
        },
        // Chunk naming
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId ? chunkInfo.facadeModuleId.split('/').pop() : 'chunk';
          return `assets/${facadeModuleId}-[hash].js`;
        },
      },
    },
    // Source maps for production debugging (optional)
    sourcemap: mode === 'development',
    // Target modern browsers
    target: 'es2020',
    // Chunk size warning limit
    chunkSizeWarningLimit: 500,
    // CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      '@supabase/supabase-js',
      'framer-motion',
      'date-fns',
      'lucide-react',
    ],
    exclude: [
      // Exclude heavy libraries from pre-bundling
      'recharts',
      '@tiptap/react',
      'jspdf',
    ],
  },
  // Enable CSS minification
  css: {
    devSourcemap: mode === 'development',
  },
}));
