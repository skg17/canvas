/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0F0D12',
        'bg-secondary': '#17131D',
        'bg-tertiary': '#1F1A27',
        'text-primary': '#E6E2EB',
        'text-secondary': '#B8B1C4',
        'text-muted': '#8A8395',
        'accent': '#644969',
        'accent-hover': '#7A5A80',
        'accent-active': '#8F6A96',
        'accent-soft': '#2A1F31',
        'border': '#2E2838',
      }
    }
  },
  plugins: [],
}

