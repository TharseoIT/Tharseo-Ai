/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Tharseo official brand palette
        "tharseo-green":       "#95B552",
        "tharseo-green-light": "#D3E1AA",
        "tharseo-yellow":      "#EFED32",
        "tharseo-blue":        "#345C72",
        "tharseo-teal":        "#175873",
        "tharseo-gray":        "#595959",
        // Surface layers (dark theme)
        "surface":                   "#0f1214",
        "surface-container-lowest":  "#0a0d0f",
        "surface-container-low":     "#141a1e",
        "surface-container":         "#1a2228",
        "surface-container-high":    "#1f2a33",
        "surface-container-highest": "#253340",
        "surface-variant":           "#253340",
        "on-surface":                "#e8edf0",
        "on-surface-variant":        "#9aaab5",
        "outline-variant":           "#2a3a46",
        // Semantic roles mapped to Tharseo brand
        "primary":           "#95B552",
        "primary-container": "#1a2e0f",
        "on-primary":        "#0a1505",
        "on-primary-container": "#b8d47a",
        "secondary":         "#EFED32",
        "on-secondary":      "#1a1a00",
        "error":             "#ffb4ab",
        "error-container":   "#93000a",
        "background":        "#0f1214",
        "on-background":     "#e8edf0",
      },
      fontFamily: {
        headline: ["Manrope", "sans-serif"],
        body:     ["Inter", "sans-serif"],
        label:    ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
}
