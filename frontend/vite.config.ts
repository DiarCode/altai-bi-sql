import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'
import { defineConfig } from 'vite'
import viteCompression from 'vite-plugin-compression'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		vue(),
		// vueDevTools(),
		tailwindcss(),
		viteCompression({
			algorithm: 'gzip',
			ext: '.gz',
			threshold: 10240,
		}),
		viteCompression({
			algorithm: 'brotliCompress',
			ext: '.br',
			threshold: 10240,
		}),
	],
	resolve: {
		alias: {
			'@': path.resolve(__dirname, './src'),
		},
	},
	build: {
		sourcemap: false,
		cssCodeSplit: true,
		target: 'es2017', // <- very important, transpile modern JS to es2017 for compatibility
		minify: 'esbuild', // you can switch to 'terser' if needed
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						return 'vendor'
					}
				},
			},
		},
		commonjsOptions: {
			transformMixedEsModules: true,
		},
	},
})
