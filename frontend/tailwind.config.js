/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface":                   "#131313",
        "surface-container-lowest":  "#0e0e0e",
        "surface-container-low":     "#1c1b1b",
        "surface-container":         "#201f1f",
        "surface-container-high":    "#2a2a2a",
        "surface-container-highest": "#353534",
        "surface-variant":           "#353534",
        "on-surface":                "#e5e2e1",
        "on-surface-variant":        "#c0c9bf",
        "outline-variant":           "#414942",
        "primary":                   "#9dd3ab",
        "primary-container":         "#2d5f3f",
        "on-primary":                "#00391d",
        "on-primary-container":      "#a1d7ae",
        "secondary":                 "#f0c030",
        "on-secondary":              "#3e2e00",
        "error":                     "#ffb4ab",
        "error-container":           "#93000a",
        "background":                "#131313",
        "on-background":             "#e5e2e1",
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
