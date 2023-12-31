/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./index.html",
    "./exporter.html",
    "./info-steam-on-browser.html",
    "./_code/*.mjs",
    "./_code/*.css",
  ],
  theme: {
    extend: {},
  },
  plugins: [
      require("daisyui")
  ],

  daisyui: {
    themes: [
      "emerald",
    ]
  }
}
