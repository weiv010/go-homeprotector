import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' 로 두면 GitHub Pages 같은 하위 경로에서도 그대로 동작한다.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
