/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.html",
    "./index.html",
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
