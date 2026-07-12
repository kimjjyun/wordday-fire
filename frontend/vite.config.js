import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'WordDay - 영어 단어 암기와 조회 테스트',
        short_name: 'WordDay',
        description: '매일 짧게 영어 단어를 암기하고 학급 조회 테스트에 참여하는 학습 앱',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#000000',
        lang: 'ko-KR',
        categories: ['education'],
        icons: [
          { src: '/icons/wordday-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/wordday-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/wordday-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: '혼자 공부하기', short_name: '혼자 공부', url: '/solo', icons: [{ src: '/icons/wordday-192.png', sizes: '192x192' }] },
          { name: '학생·교사 로그인', short_name: '로그인', url: '/login', icons: [{ src: '/icons/wordday-192.png', sizes: '192x192' }] },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
