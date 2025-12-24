/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    'node_modules/preline/dist/*.js', // Preline UI
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'sans-serif'], // Nunito as default sans font
      },
      colors: {
        primary: '#1976D2', // Accent
        // Semantic colors will use Tailwind defaults
      },
      borderRadius: {
        'sm': '8px',   // Small elements (inputs, buttons) - now 8px
        'DEFAULT': '8px', // Default (cards, modals) - now 8px
        'md': '8px',   // Medium elements - 8px
      },
      fontSize: {
        // Base font size: 16px (1rem) with regular 400 weight
        'xs': ['0.75rem', { lineHeight: '1.5', fontWeight: '400' }],    // 12px
        'sm': ['0.875rem', { lineHeight: '1.5', fontWeight: '400' }],   // 14px
        'base': ['1rem', { lineHeight: '1.6', fontWeight: '400' }],     // 16px - standard normal text
        'lg': ['1.125rem', { lineHeight: '1.6', fontWeight: '400' }],  // 18px
        'xl': ['1.25rem', { lineHeight: '1.6', fontWeight: '400' }],   // 20px
        '2xl': ['1.5rem', { lineHeight: '1.5', fontWeight: '400' }],   // 24px
        '3xl': ['1.875rem', { lineHeight: '1.4', fontWeight: '400' }],  // 30px
        '4xl': ['2.25rem', { lineHeight: '1.3', fontWeight: '400' }],  // 36px
      },
    },
  },
  plugins: [
    // Preline UI doesn't require a Tailwind plugin - it works via content scanning
  ],
}

