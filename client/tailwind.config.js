/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sim: {
          bg: '#0a0a1a', surface: '#111128', border: '#1e1e3a',
          accent: '#4f6ef7', gold: '#d4a838', red: '#e05a5a',
          green: '#4ecb71', text: '#e0e0f0', muted: '#7070a0',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        ui: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
