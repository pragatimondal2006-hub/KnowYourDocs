/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F6EFE5",
        ivory: "#FBF8F3",
        caramel: "#C8A98A",
        espresso: "#684B3B",
        taupe: "#C9BBA7",
        grey: "#8E8E8E",
        oat: "#E8DED1",
        mocha: "#927968",
        sand: "#EFE5D8",
        coffee: "#49372D",
        border: "#E4D8C9",
      },
      fontFamily: {
        heading: ["Manrope", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
      },
      boxShadow: {
        soft: "0 2px 10px rgba(104, 75, 59, 0.06)",
        softer: "0 4px 16px rgba(104, 75, 59, 0.09)",
      },
      spacing: {
        4.5: "18px",
      },
      keyframes: {
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.7" },
          "50%": { transform: "scale(1.15)", opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        breathe: "breathe 1.6s ease-in-out infinite",
        "fade-up": "fade-up 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
