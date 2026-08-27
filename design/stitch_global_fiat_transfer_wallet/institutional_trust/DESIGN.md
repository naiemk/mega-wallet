---
name: Institutional Trust
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#465f88'
  primary: '#000a1e'
  on-primary: '#ffffff'
  primary-container: '#002147'
  on-primary-container: '#708ab5'
  inverse-primary: '#aec7f6'
  secondary: '#006c47'
  on-secondary: '#ffffff'
  secondary-container: '#8af5be'
  on-secondary-container: '#00714b'
  tertiary: '#070b0d'
  on-tertiary: '#ffffff'
  tertiary-container: '#1e2224'
  on-tertiary-container: '#85898b'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aec7f6'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#2d476f'
  secondary-fixed: '#8df7c1'
  secondary-fixed-dim: '#71dba6'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005235'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#181c1e'
  on-tertiary-fixed-variant: '#434749'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  display-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  numeric-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  display-md-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-margin: 20px
  gutter: 12px
---

## Brand & Style

This design system is engineered for a fintech environment where security and reliability are the primary user expectations. The visual narrative utilizes a **Corporate Modern** style, characterized by a structured layout, purposeful whitespace, and a high-legibility sans-serif typeface. 

The strategy focuses on "Safe" design patterns—familiar interactions that reduce cognitive load and reinforce institutional stability. By blending traditional financial aesthetics with modern digital efficiency, the interface communicates both the permanence of a bank and the agility of a technology platform. The emotional response sought is one of calm confidence and absolute clarity.

## Colors

The palette is anchored by a deep navy (`#002147`), chosen to evoke the heritage and stability of traditional financial institutions. This is contrasted with a vibrant emerald green (`#00875A`) used strategically for "growth" indicators, primary actions, and success states.

- **Primary (Oxford Navy):** Used for headers, primary buttons, and core brand elements to establish authority.
- **Secondary (Emerald Growth):** Reserved for positive financial trends, confirmation buttons, and active progress states.
- **Backgrounds:** A soft off-white/light grey (`#F4F7F9`) is used for the main canvas to reduce glare and differentiate from pure white card surfaces.
- **Status Colors:** Use standard semantic reds for errors/decline and ambers for pending alerts, ensuring high contrast against the navy primary.

## Typography

The design system exclusively uses **Inter** to ensure maximum legibility across high-density data views and various screen resolutions. 

- **Numerical Data:** For balance cards and transaction amounts, use `numeric-xl` with tighter letter-spacing to create a "locked-in" professional feel.
- **Hierarchy:** Use `label-md` in uppercase for secondary section headers (e.g., "RECENT TRANSACTIONS") to create clear visual separation without adding weight.
- **Responsiveness:** On mobile devices, `display-lg` should be avoided for anything other than primary hero balances; use `display-md-mobile` for standard page titles.

## Layout & Spacing

This design system employs an **8px grid system** to ensure mathematical harmony across all components. For mobile layouts, a 4-column fluid grid is utilized with 20px outside margins.

- **Content Grouping:** Use `md` (16px) for internal card padding and `lg` (24px) for vertical spacing between distinct content blocks.
- **Touch Targets:** All interactive elements must maintain a minimum height of 48px to comply with accessibility standards, regardless of their visual height.
- **Vertical Rhythm:** Tighten spacing to `sm` (8px) for related label-input pairs to visually tie the elements together.

## Elevation & Depth

To maintain a professional, trustworthy atmosphere, depth is conveyed through **Tonal Layers** and **Ambient Shadows**. This avoids the "playfulness" of heavy shadows in favor of subtle, structural hierarchy.

- **Level 0 (Surface):** The main background layer using the tertiary color.
- **Level 1 (Card):** White surfaces with a very soft, 10% opacity navy shadow (Blur: 8px, Y: 2px). Used for transaction list items and secondary widgets.
- **Level 2 (Active):** Used for primary balance cards. These may use the oxford navy background with a 15% opacity primary color shadow to create a "lifted" institutional presence.
- **Outlines:** In high-density data areas, replace shadows with a 1px border (`#E2E8F0`) to maintain a clean, organized appearance.

## Shapes

The design system utilizes **Rounded** (Level 2) geometry to soften the professional aesthetic and make the app feel accessible while remaining firmly within a corporate framework.

- **Standard Components:** Buttons, input fields, and small cards use a 0.5rem (8px) radius.
- **Large Containers:** Balance cards and prominent modal sheets use `rounded-lg` (16px) to create a distinct visual frame for high-priority information.
- **Interactive Pills:** Currency pickers and category chips use `rounded-xl` (24px) to distinguish them from structural elements.

## Components

### Balance Cards
The centerpiece of the dashboard. Use the primary oxford navy background with white typography. Ensure the currency symbol is slightly smaller than the integer to maintain focus on the value. Include a subtle "sparkline" in emerald green to indicate weekly trends.

### Currency Pickers
Designed as a pill-shaped button. The left side features a circular flag/icon (24x24px) followed by the currency code in `label-md`. Use a light grey background (`#EDF2F7`) to differentiate from the main card surface.

### Transaction Lists
Use a clean, unbordered list view. Each item features a leading icon (rounded-lg background), a two-line text stack (merchant name and category), and a trailing amount. Positive amounts are displayed in emerald green; negative amounts in oxford navy.

### 3-Step Progress Stepper
Horizontal alignment. Completed steps are indicated by an emerald green circle with a checkmark. The active step features a navy border and navy text. Inactive steps use a soft grey. Connect steps with a 2px horizontal line that fills with green as the user progresses.

### Input Fields
Strictly rectangular with 8px rounded corners. Use a 1px neutral border that thickens and changes to navy on focus. Floating labels are preferred to maintain context in compact mobile views.