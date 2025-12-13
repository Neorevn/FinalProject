/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      textShadow: {
        'cyan': '0 0 8px rgba(0, 255, 255, 0.7)',
        'fuchsia': '0 0 8px rgba(217, 70, 239, 0.7)',
        'green': '0 0 8px rgba(52, 211, 153, 0.7)',
        'orange': '0 0 8px rgba(251, 146, 60, 0.7)',
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(0, 255, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3) inset',
        'fuchsia-glow': '0 0 15px rgba(217, 70, 239, 0.5), 0 0 20px rgba(217, 70, 239, 0.3) inset',
        'green-glow': '0 0 15px rgba(52, 211, 153, 0.5), 0 0 20px rgba(52, 211, 153, 0.3) inset',
      }
    },
  },
  plugins: [],
}