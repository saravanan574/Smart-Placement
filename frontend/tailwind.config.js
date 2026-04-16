/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/**/*.{js,jsx,ts,tsx}',
      './public/index.html'
    ],
    theme: {
      extend: {
        colors: {
          primary: '#1F4E79',
          accent: '#2E75B6',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
          'sidebar-bg': '#1F2937',
          'sidebar-active': '#2E75B6'
        },
        fontFamily: {
          sans: ['Inter', 'sans-serif']
        }
      }
    },
    plugins: []
  }