/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin')

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderStyle: {
        'outset': 'outset',
      },
      backgroundImage: {
        'progress-pattern': `url("data:image/svg+xml,%3Csvg%20xmlns%3D'http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg'%20width%3D'50'%20height%3D'100'%20viewBox%3D'0%200%205%2010'%3E%0A%09%3Crect%20width%3D'110%25'%20x%3D'-5%25'%20y%3D'-5%25'%20height%3D'110%25'%20fill%3D'transparent'%2F%3E%0A%09%3Cline%20x1%3D'-2'%20y1%3D'1'%20x2%3D'7'%20y2%3D'10'%20stroke%3D'%23D32F2F'%20stroke-width%3D'2'%2F%3E%0A%09%3Cline%20x1%3D'-2'%20y1%3D'6'%20x2%3D'7'%20y2%3D'15'%20stroke%3D'%23D32F2F'%20stroke-width%3D'2'%2F%3E%0A%09%3Cline%20x1%3D'-2'%20y1%3D'-4'%20x2%3D'7'%20y2%3D'5'%20stroke%3D'%23D32F2F'%20stroke-width%3D'2'%2F%3E%0A%3C%2Fsvg%3E")`
      },
      keyframes:  {
        // 'progress-indefinite': {
        //   'from': { 'background-position': '0% 0%'},
        //   'to': { 'background-position': '100% 0%'}
        // }
        progress: {
          'from': { 'background-position': '0% 0%' },
          'to': { 'background-position': '100% 0%' },
        }
      },
      animation: {
        // 'progress-indefinite': 'progress-indefinite 1s linear',
        progress: 'progress 1s infinite linear 0s',
      },
    },
  },
  plugins: [
    plugin(function({ addUtilities }) {
      addUtilities({
        '.border-outset': {
          'border-style': 'outset'
        },
      })
    })
  ],
};
