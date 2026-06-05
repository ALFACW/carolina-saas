/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#1c61c0',
          bright: '#5eb4fa',
          soft: '#dbeefe',
          line: '#bfe1fe',
        },
        ink: {
          DEFAULT: '#111111',
          2: '#565660',
        },
        surface: {
          DEFAULT: '#ffffff',
          soft: '#f9f9f9',
        },
        border: {
          DEFAULT: '#e8e8ea',
          strong: '#dcdce0',
        },
        success: '#0b7d5b',
        warning: '#b45309',
        danger: '#c0392b',
      },
      fontFamily: {
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        brand: ['"Quicksand"', 'sans-serif'],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(17,17,17,0.06), 0 1px 1px rgba(17,17,17,0.04)',
        md: '0 10px 30px -12px rgba(17,17,17,0.18), 0 4px 12px -6px rgba(17,17,17,0.08)',
      },
    },
  },
  plugins: [],
}
