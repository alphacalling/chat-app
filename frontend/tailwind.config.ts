export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'whatsapp-green': '#00a884',
        'whatsapp-dark': '#111b21',
        'whatsapp-panel': '#202c33',
        'outgoing-bg': '#005c4b',
        'incoming-bg': '#202c33',
      }
    },
  },
  plugins: [],
}