/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "media",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      // Breakpoints por altura baja (p. ej. 1280×720)
      screens: {
        short: { raw: "(max-height: 740px)" },
        "short-xl": { raw: "(min-width: 1280px) and (max-height: 740px)" },
      },
    },
  },
  plugins: [],
};
