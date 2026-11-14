/** Konfigurasi Tailwind (build statis, menggantikan cdn.tailwindcss.com).
 *  Bangun ulang CSS setelah menambah class Tailwind baru:  npm install && npm run build:css */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'], display: ['Outfit', 'sans-serif'] },
      colors: { neon: { cyan: '#00f3ff', purple: '#b026ff', pink: '#ff007f', green: '#00ff66' } }
    }
  }
};
