import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: '#0c1815',
        baseDeep: '#070d0b',
        panel: '#122019',
        panelRaised: '#182a22',
        cream: '#FBF9F2',
        creamDim: '#cfd4cd',
        gold: '#D9B876',
        goldSoft: '#EAD6A0',
        sage: '#9DB89A',
        danger: '#C17456'
      },
      fontFamily: {
        serif: ['var(--font-noto-serif-jp)', 'serif'],
        display: ['var(--font-cormorant)', 'serif'],
        sans: ['var(--font-noto-sans-jp)', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
