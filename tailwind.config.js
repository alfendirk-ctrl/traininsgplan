/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  // De bestaande app is volledig inline gestyled; een globale reset zou die
  // stilletjes veranderen. De Reps-app krijgt zijn resets gescoped in index.css.
  corePlugins: { preflight: false },
  theme: { extend: {} },
  plugins: [],
};
