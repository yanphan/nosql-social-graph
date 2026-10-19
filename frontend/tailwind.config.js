/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#0B1020',
        surface: 'rgba(255, 255, 255, 0.04)',
        surfaceBorder: 'rgba(255, 255, 255, 0.08)',
        ink: '#E6E9F5',
        muted: '#8B93B0',
        user: '#6366F1',
        post: '#22D3EE',
        topic: '#F59E0B',
        danger: '#F43F5E',
        good: '#10B981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px -10px rgba(99, 102, 241, 0.6)',
        postGlow: '0 0 40px -10px rgba(34, 211, 238, 0.6)',
      },
      backgroundImage: {
        accent: 'linear-gradient(135deg, #6366F1, #22D3EE)',
        glass: 'linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.01))',
      },
    },
  },
  plugins: [],
};
