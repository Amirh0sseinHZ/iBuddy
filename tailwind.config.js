
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx,jsx,js}"],
  important: "body",
  theme: {
    screens: {
      xs: '300px',
      sm: '480px',
      md: '768px',
      lg: '976px',
      xl: '1440px',
    },
    colors: {/* using MUI instead */ },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}

