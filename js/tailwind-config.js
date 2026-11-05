/**
 * tailwind-config.js
 * Pengaturan Tailwind CSS (CDN): font Inter/Outfit dan warna neon tema Kurniapedia.
 * Harus dimuat SETELAH script Tailwind CDN di index.html.
 */

tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Outfit', 'sans-serif'],
            },
            colors: {
                neon: {
                    cyan: '#00f3ff',
                    purple: '#b026ff',
                    pink: '#ff007f',
                    green: '#00ff66'
                }
            }
        }
    }
}
