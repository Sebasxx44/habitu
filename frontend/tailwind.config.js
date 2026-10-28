/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        habitu: {
          primary: "hsl(var(--primary) / <alpha-value>)",
          dark: "rgb(var(--habitu-primary-dark-rgb) / <alpha-value>)",
          soft: "rgb(var(--habitu-primary-soft-rgb) / <alpha-value>)",
          gold: "hsl(var(--accent) / <alpha-value>)",
          lime: "rgb(213 250 71 / <alpha-value>)",
          blue: "rgb(59 77 255 / <alpha-value>)",
          cream: "hsl(var(--secondary) / <alpha-value>)",
          surface: "rgb(var(--habitu-surface-rgb) / <alpha-value>)",
          ink: "hsl(var(--foreground) / <alpha-value>)",
          muted: "hsl(var(--muted-foreground) / <alpha-value>)",
          border: "hsl(var(--border) / <alpha-value>)",
        },
      },
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
        poppins: ['Manrope', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl2: '1.25rem',
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        soft: 'var(--habitu-shadow)',
        card: 'var(--habitu-shadow)',
        elevated: 'var(--habitu-shadow-dark)',
      },
    },
  },
  plugins: [],
}
