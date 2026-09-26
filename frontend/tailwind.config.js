/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: {
    relative: true,
    files: [
      "./src/components/**/*.{js,jsx}",
      "./src/hooks/**/*.js",
      "./src/models/**/*.js",
      "./src/pages/**/*.{js,jsx}",
      "./src/utils/**/*.js",
      "./src/*.jsx",
      "./index.html",
      "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}"
    ]
  },
  theme: {
    extend: {
      rotate: {
        "270": "270deg",
        "360": "360deg"
      },
      colors: {
        "black-900": "#141414",
        accent: "#223049",
        "sidebar-button": "#16223A",
        sidebar: "#101A2D",
        "historical-msg-system": "rgba(255, 255, 255, 0.05);",
        "historical-msg-user": "#16223A",
        outline: "#2A3650",
        "primary-button": "var(--theme-button-primary)",
        "cta-button": "var(--theme-button-cta)",
        secondary: "#16223A",
        "dark-input": "#0B1322",
        "mobile-onboarding": "#16223A",
        "dark-highlight": "#101A2D",
        "dark-text": "#222628",
        description: "#AAB7CD",
        "x-button": "#8190A8",
        royalblue: "#065986",
        purple: "#4A1FB8",
        magenta: "#9E165F",
        danger: "#F04438",
        error: "#B42318",
        warn: "#854708",
        success: "#05603A",
        darker: "#F4F4F4",
        teal: "#0BA5EC",

        // Mission LLM design tokens (concept 1). Values live in src/index.css
        // (:root is dark, [data-theme="light"] overrides). Solid colors take
        // opacity modifiers, e.g. bg-ml-panel/60.
        ml: {
          ground: "rgb(var(--ml-ground-rgb) / <alpha-value>)",
          rail: "rgb(var(--ml-rail-rgb) / <alpha-value>)",
          panel: "rgb(var(--ml-panel-rgb) / <alpha-value>)",
          raised: "rgb(var(--ml-raised-rgb) / <alpha-value>)",
          "raised-2": "rgb(var(--ml-raised-2-rgb) / <alpha-value>)",
          text: "rgb(var(--ml-text-rgb) / <alpha-value>)",
          "text-2": "rgb(var(--ml-text-2-rgb) / <alpha-value>)",
          "text-3": "rgb(var(--ml-text-3-rgb) / <alpha-value>)",
          accent: "rgb(var(--ml-accent-rgb) / <alpha-value>)",
          ok: "rgb(var(--ml-ok-rgb) / <alpha-value>)",
          warn: "rgb(var(--ml-warn-rgb) / <alpha-value>)",
          bad: "rgb(var(--ml-bad-rgb) / <alpha-value>)",
          line: "var(--ml-line)",
          "line-2": "var(--ml-line-2)",
          "accent-fill": "var(--ml-accent-fill)",
          "accent-soft": "var(--ml-accent-soft)",
          "accent-line": "var(--ml-accent-line)",
          "accent-text": "var(--ml-accent-text)",
          "on-accent": "var(--ml-on-accent)",
          focus: "var(--ml-focus)",
          "ok-soft": "var(--ml-ok-soft)",
          "warn-soft": "var(--ml-warn-soft)",
          "bad-soft": "var(--ml-bad-soft)",
        },

        // Neutral scales retinted to the navy family so the many hardcoded
        // zinc-* (dark) and slate-* (light) classes match the palette.
        // zinc 950/900/800 = ground/panel/raised-2, 300/400 = text-2/text-3.
        zinc: {
          50: "#EEF2F9",
          100: "#E1E7F1",
          200: "#CBD4E3",
          300: "#AAB7CD",
          400: "#8B99B1",
          500: "#707F98",
          600: "#4A5770",
          700: "#2A3650",
          800: "#16223A",
          900: "#0B1322",
          950: "#060A13",
        },
        // slate 50/100 = light ground/rail, 500/600/900 = light text tiers.
        slate: {
          50: "#F3F5F9",
          100: "#EBEFF6",
          200: "#E1E7F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#5A6780",
          600: "#42506A",
          700: "#334155",
          800: "#1E293B",
          900: "#0B1528",
          950: "#020617",
        },

        // Generic theme colors
        theme: {
          bg: {
            primary: 'var(--theme-bg-primary)',
            secondary: 'var(--theme-bg-secondary)',
            sidebar: 'var(--theme-bg-sidebar)',
            container: 'var(--theme-bg-container)',
            chat: 'var(--theme-bg-chat)',
            "chat-input": 'var(--theme-bg-chat-input)',
            "popup-menu": 'var(--theme-popup-menu-bg)',
          },
          text: {
            primary: 'var(--theme-text-primary)',
            secondary: 'var(--theme-text-secondary)',
            placeholder: 'var(--theme-placeholder)',
          },
          sidebar: {
            item: {
              default: 'var(--theme-sidebar-item-default)',
              selected: 'var(--theme-sidebar-item-selected)',
              hover: 'var(--theme-sidebar-item-hover)',
            },
            subitem: {
              default: 'var(--theme-sidebar-subitem-default)',
              selected: 'var(--theme-sidebar-subitem-selected)',
              hover: 'var(--theme-sidebar-subitem-hover)',
            },
            footer: {
              icon: 'var(--theme-sidebar-footer-icon)',
              'icon-hover': 'var(--theme-sidebar-footer-icon-hover)',
            },
            border: 'var(--theme-sidebar-border)',
          },
          "chat-input": {
            border: 'var(--theme-chat-input-border)',
          },
          "action-menu": {
            bg: 'var(--theme-action-menu-bg)',
            "item-hover": 'var(--theme-action-menu-item-hover)',
          },
          settings: {
            input: {
              bg: 'var(--theme-settings-input-bg)',
              active: 'var(--theme-settings-input-active)',
              placeholder: 'var(--theme-settings-input-placeholder)',
              text: 'var(--theme-settings-input-text)',
            }
          },
          modal: {
            border: 'var(--theme-modal-border)',
          },
          "file-picker": {
            hover: 'var(--theme-file-picker-hover)',
          },
          attachment: {
            bg: 'var(--theme-attachment-bg)',
            'error-bg': 'var(--theme-attachment-error-bg)',
            'success-bg': 'var(--theme-attachment-success-bg)',
            text: 'var(--theme-attachment-text)',
            'text-secondary': 'var(--theme-attachment-text-secondary)',
            'icon': 'var(--theme-attachment-icon)',
            'icon-spinner': 'var(--theme-attachment-icon-spinner)',
            'icon-spinner-bg': 'var(--theme-attachment-icon-spinner-bg)',
          },
          home: {
            text: 'var(--theme-home-text)',
            "text-secondary": 'var(--theme-home-text-secondary)',
            "bg-card": 'var(--theme-home-bg-card)',
            "bg-button": 'var(--theme-home-bg-button)',
            border: 'var(--theme-home-border)',
            "button-primary": 'var(--theme-home-button-primary)',
            "button-primary-hover": 'var(--theme-home-button-primary-hover)',
            "button-secondary": 'var(--theme-home-button-secondary)',
            "button-secondary-hover": 'var(--theme-home-button-secondary-hover)',
            "button-secondary-text": 'var(--theme-home-button-secondary-text)',
            "button-secondary-hover-text": 'var(--theme-home-button-secondary-hover-text)',
            "button-secondary-border": 'var(--theme-home-button-secondary-border)',
            "button-secondary-border-hover": 'var(--theme-home-button-secondary-border-hover)',
            "update-card-bg": 'var(--theme-home-update-card-bg)',
            "update-card-hover": 'var(--theme-home-update-card-hover)',
            "update-source": 'var(--theme-home-update-source)',
          },
          checklist: {
            "item-bg": 'var(--theme-checklist-item-bg)',
            "item-bg-hover": 'var(--theme-checklist-item-bg-hover)',
            "item-text": 'var(--theme-checklist-item-text)',
            "item-completed-bg": 'var(--theme-checklist-item-completed-bg)',
            "item-completed-text": 'var(--theme-checklist-item-completed-text)',
            "item-hover": 'var(--theme-checklist-item-hover)',
            "checkbox-border": 'var(--theme-checklist-checkbox-border)',
            "checkbox-fill": 'var(--theme-checklist-checkbox-fill)',
            "checkbox-text": 'var(--theme-checklist-checkbox-text)',
            "button-border": 'var(--theme-checklist-button-border)',
            "button-text": 'var(--theme-checklist-button-text)',
            "button-hover-bg": 'var(--theme-checklist-button-hover-bg)',
            "button-hover-border": 'var(--theme-checklist-button-hover-border)',
          },
          button: {
            text: 'var(--theme-button-text)',
            'code-hover-text': 'var(--theme-button-code-hover-text)',
            'code-hover-bg': 'var(--theme-button-code-hover-bg)',
            'disable-hover-text': 'var(--theme-button-disable-hover-text)',
            'disable-hover-bg': 'var(--theme-button-disable-hover-bg)',
            'delete-hover-text': 'var(--theme-button-delete-hover-text)',
            'delete-hover-bg': 'var(--theme-button-delete-hover-bg)',
          },
        },
      },
      backgroundImage: {
        "preference-gradient":
          "linear-gradient(180deg, #5A5C63 0%, rgba(90, 92, 99, 0.28) 100%);",
        "chat-msg-user-gradient":
          "linear-gradient(180deg, #3D4147 0%, #2C2F35 100%);",
        "selected-preference-gradient":
          "linear-gradient(180deg, #313236 0%, rgba(63.40, 64.90, 70.13, 0) 100%);",
        "main-gradient": "linear-gradient(180deg, #3D4147 0%, #2C2F35 100%)",
        "modal-gradient": "linear-gradient(180deg, #3D4147 0%, #2C2F35 100%)",
        "sidebar-gradient": "linear-gradient(90deg, #5B616A 0%, #3F434B 100%)",
        "login-gradient": "linear-gradient(180deg, #3D4147 0%, #2C2F35 100%)",
        "menu-item-gradient":
          "linear-gradient(90deg, #3D4147 0%, #2C2F35 100%)",
        "menu-item-selected-gradient":
          "linear-gradient(90deg, #5B616A 0%, #3F434B 100%)",
        "workspace-item-gradient":
          "linear-gradient(90deg, #3D4147 0%, #2C2F35 100%)",
        "workspace-item-selected-gradient":
          "linear-gradient(90deg, #5B616A 0%, #3F434B 100%)",
        "switch-selected": "linear-gradient(146deg, #5B616A 0%, #3F434B 100%)"
      },
      borderColor: {
        DEFAULT: "var(--ml-line-2)",
      },
      boxShadow: {
        ml: "var(--ml-shadow)",
        "ml-pop": "var(--ml-shadow-pop)",
      },
      spacing: {
        gutter: "var(--ml-gutter)",
        topbar: "var(--ml-topbar-h)",
        rail: "var(--ml-rail-w)",
        drawer: "var(--ml-drawer-w)",
        ctl: "var(--ml-ctl)",
        "ctl-lg": "var(--ml-ctl-lg)",
        field: "var(--ml-field)",
        "set-gutter": "var(--ml-set-gutter)",
      },
      transitionTimingFunction: {
        ml: "var(--ml-ease)",
      },
      fontFamily: {
        display: ["Archivo", "Public Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          '"IBM Plex Mono"',
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          '"Liberation Mono"',
          "monospace"
        ],
        sans: [
          '"Public Sans"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          '"Helvetica Neue"',
          "Arial",
          '"Noto Sans"',
          "sans-serif",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"'
        ]
      },
      animation: {
        sweep: "sweep 0.5s ease-in-out",
        "pulse-glow": "pulse-glow 1.5s infinite",
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.4s ease-out forwards',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite'
      },
      keyframes: {
        sweep: {
          "0%": { transform: "scaleX(0)", transformOrigin: "bottom left" },
          "100%": { transform: "scaleX(1)", transformOrigin: "bottom left" }
        },
        fadeIn: {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 }
        },
        fadeOut: {
          "0%": { opacity: 1 },
          "100%": { opacity: 0 }
        },
        "pulse-glow": {
          "0%": {
            opacity: 1,
            transform: "scale(1)",
            boxShadow: "0 0 0 rgba(255, 255, 255, 0.0)",
            backgroundColor: "rgba(255, 255, 255, 0.0)"
          },
          "50%": {
            opacity: 1,
            transform: "scale(1.1)",
            boxShadow: "0 0 15px rgba(255, 255, 255, 0.2)",
            backgroundColor: "rgba(255, 255, 255, 0.1)"
          },
          "100%": {
            opacity: 1,
            transform: "scale(1)",
            boxShadow: "0 0 0 rgba(255, 255, 255, 0.0)",
            backgroundColor: "rgba(255, 255, 255, 0.0)"
          }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' }
        }
      }
    }
  },
  variants: {
    extend: {
      backgroundColor: ['light'],
      textColor: ['light'],
    }
  },
  // Required for rechart styles to show since they can be rendered dynamically and will be tree-shaken if not safe-listed.
  safelist: [
    {
      pattern:
        /^(bg-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"]
    },
    {
      pattern:
        /^(text-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"]
    },
    {
      pattern:
        /^(border-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/,
      variants: ["hover", "ui-selected"]
    },
    {
      pattern:
        /^(ring-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/
    },
    {
      pattern:
        /^(stroke-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/
    },
    {
      pattern:
        /^(fill-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:50|100|200|300|400|500|600|700|800|900|950))$/
    }
  ],
  plugins: [
    function ({ addVariant }) {
      addVariant('light', '.light &') // Add the `light:` variant
      addVariant('pwa', '.pwa &') // Add the `pwa:` variant
    },
    // The `animate-in`/`animate-out` enter+exit utilities from `tailwindcss-animate`,
    // reproduced for the subset of modifiers we use so components copied from
    // shadcn-based libraries keep their original class strings.
    function ({ addBase, addUtilities }) {
      addBase({
        '@keyframes enter': {
          from: {
            opacity: 'var(--tw-enter-opacity, 1)',
            transform:
              'translate3d(var(--tw-enter-translate-x, 0), var(--tw-enter-translate-y, 0), 0)'
          }
        },
        '@keyframes exit': {
          to: {
            opacity: 'var(--tw-exit-opacity, 1)',
            transform:
              'translate3d(var(--tw-exit-translate-x, 0), var(--tw-exit-translate-y, 0), 0)'
          }
        }
      })
      addUtilities({
        '.animate-in': { animationName: 'enter', animationDuration: '150ms', animationFillMode: 'both' },
        '.animate-out': { animationName: 'exit', animationDuration: '150ms', animationFillMode: 'both' },
        '.fade-in-0': { '--tw-enter-opacity': '0' },
        '.fade-out-0': { '--tw-exit-opacity': '0' },
        '.slide-in-from-top-2': { '--tw-enter-translate-y': '-0.5rem' },
        '.slide-out-to-top-2': { '--tw-exit-translate-y': '-0.5rem' }
      })
    }
  ]
}
