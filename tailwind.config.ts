import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
  	extend: {
  		colors: {
  			bg: 'var(--color-bg)',
  			surface: 'var(--color-surface)',
  			'surface-hover': 'var(--color-surface-hover)',
  			border: 'var(--color-border)',
  			'border-hover': 'var(--color-border-hover)',
  			text: 'var(--color-text)',
  			muted: 'var(--color-muted)',
  			accent: 'var(--color-accent)',
  			'accent-hover': 'var(--color-accent-hover)',
  			'accent-dim': 'var(--color-accent-dim)',
  			warning: 'var(--color-warning)',
  			'warning-dim': 'var(--color-warning-dim)',
  			danger: 'var(--color-danger)',
  			'danger-dim': 'var(--color-danger-dim)'
  		},
  		fontFamily: {
  			display: [
  				'DM Serif Display',
  				'Georgia',
  				'serif'
  			],
  			mono: [
  				'JetBrains Mono',
  				'Fira Code',
  				'monospace'
  			]
  		},
  		borderRadius: {
  			sm: '0.375rem',
  			md: '0.5rem',
  			lg: '0.75rem',
  			xl: '1rem',
  			'2xl': '1.25rem'
  		},
  		boxShadow: {
  			'accent-glow': '0 0 20px 0 color-mix(in srgb, var(--color-accent) 25%, transparent)',
  			'surface-lg': '0 8px 32px 0 rgba(0, 0, 0, 0.6)'
  		},
  		keyframes: {
  			'fade-in': {
  				from: {
  					opacity: '0',
  					transform: 'translateY(6px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-in-fast': {
  				from: {
  					opacity: '0'
  				},
  				to: {
  					opacity: '1'
  				}
  			},
  			shimmer: {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(200%)'
  				}
  			},
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'fade-in': 'fade-in 0.3s ease-out forwards',
  			'fade-in-fast': 'fade-in-fast 0.15s ease-out forwards',
  			shimmer: 'shimmer 1.6s ease-in-out infinite',
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
