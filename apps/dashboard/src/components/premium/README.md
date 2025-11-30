# BIZRA Premium Components

Premium UI components integrated from the award-winning design system, providing world-class UX that makes users "feel the difference."

## Components

### Brand Components (`components/brand/`)

| Component | Description | Usage |
|-----------|-------------|-------|
| `BizraLogo` | Static Seed of Life sacred geometry logo | `<BizraLogo size={200} variant="minimal" />` |
| `BizraLogoAnimated` | Draw-on animation with construction circles | `<BizraLogoAnimated size="lg" delay={500} />` |
| `SacredLogo` | Legacy logo component | `<SacredLogo />` |

### Premium Components (`components/premium/`)

| Component | Description | Usage |
|-----------|-------------|-------|
| `LoadingScreen` | Agent awakening animation | `<LoadingScreen onComplete={() => {}} />` |
| `CosmicBackground` | 5,000 particle Three.js starfield | `<CosmicBackground />` (inside Canvas) |
| `CosmicBackground2D` | Canvas-based 2D version | `<CosmicBackground2D />` |
| `NavDock` | Glass morphism floating navigation | `<NavDock items={[...]} />` |
| `GlassCard` | Premium card with glass styling | `<GlassCard>Content</GlassCard>` |
| `MetricCard` | Card with value, label, trend | `<MetricCard label="POI" value={220181} />` |
| `HeroSection` | Landing page hero with particle network | `<HeroSection journeyTargetId="demo" />` |
| `MetricsGrid` | TMP v0.1 integrity metrics display | `<MetricsGrid title="System Integrity" />` |

## Design System

### Colors

```css
/* Brand Colors */
--gold-500: #C9A962;      /* Primary gold */
--navy-900: #0A1628;      /* Deep navy */
--teal-400: #2A9D8F;      /* Accent teal */

/* Gold Scale */
--gold-100 through --gold-900
```

### Typography

```css
/* Fonts */
font-serif: 'Playfair Display';  /* Headlines */
font-sans: 'Inter';              /* UI text */
font-arabic: 'Amiri';            /* Arabic tagline */
```

### Glass Morphism

```css
/* Glass styling */
.glass-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
}
```

## Pages

| Page | Route | Description |
|------|-------|-------------|
| `Landing` | `/` | 3D Citadel experience |
| `PremiumLanding` | `/premium-landing` | 2D premium landing |
| `PremiumDashboard` | `/premium-dashboard` | World-class admin experience |
| `premium-experience` | `/premium-experience` | Component showcase |

## Example Usage

```tsx
import { 
  HeroSection, 
  MetricsGrid, 
  GlassCard,
  CosmicBackground2D,
  NavDock 
} from '@/components/premium';
import { BizraLogoAnimated } from '@/components/brand';

export default function MyPage() {
  return (
    <main className="min-h-screen bg-navy-900">
      <CosmicBackground2D />
      <NavDock items={[{ id: 'home', label: 'Home', href: '#home' }]} />
      <HeroSection />
      <MetricsGrid />
      <GlassCard>
        <BizraLogoAnimated size="lg" />
      </GlassCard>
    </main>
  );
}
```

## Animation Guidelines

1. **Entrance animations**: Use `framer-motion` with staggered delays
2. **Hover states**: Scale 1.02-1.05, subtle glow
3. **Loading states**: Neural network animations
4. **Transitions**: 0.3-0.5s ease-out

## Performance Notes

- `CosmicBackground` (3D): Uses GPU instancing, ~5,000 particles
- `CosmicBackground2D`: Canvas-based, lighter weight
- `HeroSection`: 100 particles with connection lines
- All components support React 18

---

*Part of BIZRA Genesis Node v0.9.0*
