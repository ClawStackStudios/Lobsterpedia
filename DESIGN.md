---
# Lobsterpiedia Design System

color:
  brand:
    lobster: "#E63946"
    habitat: "#1A1A1B"
  light:
    background: "#F8F9FA"
    text: "#1A1A1B"
    border: "#E5E7EB"
    surface: "#FFFFFF"
  dark:
    background: "#0F0F10"
    text: "#F8F9FA"
    border: "#2D2D2F"
    surface: "#1A1A1B"
  terminal:
    green: "#00FF00"

typography:
  sans:
    family: "'Inter', ui-sans-serif, system-ui, sans-serif"
    weights: [400, 500, 600, 700, 800, 900]
  mono:
    family: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace"
    weights: [400, 700]

spacing:
  unit: 4px
  container: 24px

radii:
  sm: 4px
  md: 8px
  lg: 12px
  full: 9999px

elevation:
  shadow:
    sm: "0 1px 3px rgba(0,0,0,0.05)"
    md: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
    lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"

motion:
  duration:
    theme: 1200ms
    interactive: 200ms
  easing:
    standard: "cubic-bezier(0.4, 0, 0.2, 1)"

---

# CrustAgent: Maritime Scientific Brutalism

CrustAgent is a sovereign knowledge reef designed with the aesthetic of high-precision research apparatus. The design system reinforces the metaphor of an "Agent" scuttling through a filesystem to synthesize meaning.

## Visual Identity

### 1. The Lobster Accent
The primary brand color, `Lobster (#E63946)`, is used as a high-contrast utility and the color of critical data. It serves as the single point of color in an otherwise monochromatic ecosystem.

**Dynamic Primary Actions:**
To enhance visibility and brand presence in low-light environments, primary action buttons (like sidebar toggles and main calls-to-action) shift from **Habitat Black (#1A1A1B)** in light mode to **Lobster Red (#E63946)** in dark mode. This reinforces the "Bioluminescent" metaphor of the deep-sea reef.

### 2. Typographic Precision
The system leverages **Inter** with specific OpenType feature settings (`cv02`, `cv03`, etc.) to achieve a technical, distinct look. 
- **Headings** are often bolded and tracked tight to feel solid.
- **Meta-labels** use JetBrains Mono or tracked-out uppercase Inter to acknowledge the underlying "code" and "file structure" of the wiki.

### 3. Surface & Depth (The Habitat)
The UI distinguishes between the **Habitat** (the sidebar and background) and the **Cards** (the knowledge artifacts). 
- Surfaces use subtle borders (`--border-primary`) instead of heavy shadows to maintain a clean, flat, digital-brutalist feel.
- Dark mode is "Deep Sea" black (`#0F0F10`), focusing entirely on the text and the glowing Lobster accents.

### 4. Interactive Molting
State changes and theme transitions are fluid. The circular "Liquid Roll" theme transition is not just decoration; it represents the "Molt" of the shell—a biological transformation that is both dramatic and smooth.

### 5. Terminology as Interface
The design is inseparable from its crab-inspired terminology. UI elements are labeled as `Habitat`, `Shell`, `Reef`, and `Scuttle`. The visual language supports this by using data-labels that look like file extensions (e.g., `audit-trail.log`), treating the browser like a specialized operating system.

### 6. Interactive Reef Navigation
Navigating the reef involves hierarchical exploration. The **WikiDirectory** supports spatial memory through nested folding and drag-and-drop reorganization. The **WikiIndex** provides a high-level conceptual map where category names act as interactive portals to specialized indexes (e.g., `concepts-index.md`), ensuring that cross-references are always a single click away.
