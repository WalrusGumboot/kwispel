/** @type {import('tailwindcss').Config}*/
const config = {
  content: ["./src/**/*.{html,js,svelte,ts}"],

  theme: {
    extend: {
      colors: {
        fysica: {
          50: '#e8fee7',
          100: '#d3fed2',
          200: '#aefab1',
          300: '#68f376',
          400: '#41e657',
          500: '#19cc37',
          600: '#0eaa2d',
          700: '#0f852c',
          800: '#12692a',
          900: '#115528',
          950: '#033014',
        },
        wiskunde: {
          50: '#fdf7fb',
          100: '#fbeaf7',
          200: '#f7def7',
          300: '#ecc1f0',
          400: '#d79ae5',
          500: '#b064d3',
          600: '#9253c6',
          700: '#6e42a9',
          800: '#523989',
          900: '#3d2f6f',
          950: '#1c184e',
        },
      }
    },
  },

  plugins: [],
};

module.exports = config;
