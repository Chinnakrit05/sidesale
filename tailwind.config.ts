import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["'Plus Jakarta Sans'", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        /* ---------- Design-system semantic tokens ---------- */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          container: "hsl(var(--primary-container))",
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
        /* Surface hierarchy (layered-paper system) */
        surface: {
          DEFAULT: "hsl(var(--surface))",
          low: "hsl(var(--surface-low))",
          lowest: "hsl(var(--surface-lowest))",
          high: "hsl(var(--surface-high))",
          highest: "hsl(var(--surface-highest))",
        },
        "on-surface": "hsl(var(--on-surface))",
        "on-primary-container": "hsl(var(--on-primary-container))",
        "outline-variant": "hsl(var(--outline-variant))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        /* Ambient shadows – tinted, large-blur, tucked-under */
        ambient: "0 8px 32px -4px hsl(var(--on-surface) / 0.05)",
        "ambient-lg": "0 16px 64px -4px hsl(var(--on-surface) / 0.06)",
      },
      backgroundImage: {
        /* Signature CTA gradient (#904d00 → #ff8c00 at 135°) */
        "gradient-cta": "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-container)))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
