
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: '#10B981',
					foreground: '#FFFFFF',
					100: '#E6F7F1',
					200: '#B3EAD9',
					300: '#80DCC1',
					400: '#4DCFA9',
					500: '#10B981',
					600: '#0E9467',
					700: '#0B6F4E',
					800: '#074A34',
					900: '#04251A',
				},
				accent: {
					DEFAULT: '#F59E0B',
					foreground: '#FFFFFF',
					100: '#FEF4E6',
					200: '#FCE3B6',
					300: '#FAD287',
					400: '#F7C157',
					500: '#F59E0B',
					600: '#C47F09',
					700: '#935F07',
					800: '#624004',
					900: '#312002',
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: '#F59E0B',
					foreground: '#FFFFFF',
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				status: {
					new: 'hsl(var(--status-new))',
					'new-foreground': 'hsl(var(--status-new-foreground))',
					contacted: 'hsl(var(--status-contacted))',
					'contacted-foreground': 'hsl(var(--status-contacted-foreground))',
					qualified: 'hsl(var(--status-qualified))',
					'qualified-foreground': 'hsl(var(--status-qualified-foreground))',
					converted: 'hsl(var(--status-converted))',
					'converted-foreground': 'hsl(var(--status-converted-foreground))',
					lost: 'hsl(var(--status-lost))',
					'lost-foreground': 'hsl(var(--status-lost-foreground))',
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
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
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
