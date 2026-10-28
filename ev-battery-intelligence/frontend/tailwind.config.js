/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
          900: '#064e3b',
        },
        slate: {
          850: '#131e32',
          950: '#080d1a',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        orbitron: ['Orbitron', 'monospace', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#ecfdf5',
          500: '#10b981',
          600: '#059669',
          900: '#064e3b',
        },
        slate: {
          850: '#131e32',
          950: '#080d1a',
        },
        volt: {
          cyan: '#06b6d4',
          'cyan-bright': '#22d3ee',
          green: '#10b981',
          'green-bright': '#34d399',
          crimson: '#f43f5e',
          amber: '#f59e0b',
          indigo: '#6366f1',
          obsidian: '#050508',
          carbon: '#090a0f',
        }
      }
    },
  },
  plugins: [],
}
