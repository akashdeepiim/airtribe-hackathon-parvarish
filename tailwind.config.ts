import { tokens } from './src/design/tokens';
import type { Config } from 'tailwindcss';
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: tokens.colors,
      borderRadius: { control: '16px', card: '24px' },
      minHeight: { tap: '52px' },
    },
  },
  plugins: [],
} satisfies Config;
