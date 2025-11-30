# BIZRA Onboarding Components

Premium onboarding experience components migrated and enhanced from `front-end` HTML prototypes.

## Components

### OnboardingJourney

72-second consciousness journey with 5 stages:

```tsx
import { OnboardingJourney } from '@/components/onboarding';

<OnboardingJourney
  onComplete={() => router.push('/dashboard')}
  allowSkip={true}
  duration={72}
/>
```

**Features:**
- 5 animated stages (Awakening → Sacred Geometry → Quantum Entanglement → Blockchain → Consciousness)
- Sacred geometry backgrounds (seed, flower, quantum orbitals, blockchain hex, consciousness rings)
- Neural node particles with pulse animation
- Progress bar with timer (0s → 72s)
- Agent counter (0/72 → 72/72)
- Skip button for returning users
- Click-to-advance interaction

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onComplete` | `() => void` | required | Callback when journey ends |
| `allowSkip` | `boolean` | `true` | Show skip button |
| `duration` | `number` | `72` | Total journey duration in seconds |

---

### PremiumLoading

Neural network loading animation:

```tsx
import { PremiumLoading } from '@/components/onboarding';

<PremiumLoading
  duration={5000}
  onComplete={() => setLoading(false)}
  message="Initializing neural pathways..."
/>
```

**Features:**
- 24 neural nodes in circular formation
- Connection lines with pulse animation along them
- Agent awakening counter (0 → 72)
- Consciousness level progression with messages
- Gold core with pulsing animation
- Radial gradient background effects

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `targetAgents` | `number` | `72` | Target agent count |
| `duration` | `number` | `8000` | Duration in milliseconds |
| `onComplete` | `() => void` | optional | Callback when loading completes |
| `message` | `string` | auto | Custom loading message |
| `showLogo` | `boolean` | `true` | Show BIZRA logo |

---

### SacredGeometryInterface

72-agent neural grid interface:

```tsx
import { SacredGeometryInterface } from '@/components/onboarding';

<SacredGeometryInterface
  onAgentSelect={(agent) => console.log('Selected:', agent)}
  showFlowerOfLife={true}
  title="Neural Agent Interface"
/>
```

**Features:**
- 72 agent grid (6×12 clickable nodes)
- Rotating Flower of Life SVG visualization
- System stats (Neural Activity, Quantum Field, Data Flow)
- Consciousness meter with animated fill
- Agent detail popup on selection
- Color-coded agent types

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onAgentSelect` | `(agent: Agent) => void` | optional | Agent selection callback |
| `showFlowerOfLife` | `boolean` | `true` | Show Flower of Life visualization |
| `title` | `string` | `'Neural Agent Interface'` | Custom title |

---

## Premium Invite Page

Full invitation acceptance flow at `/invite/premium/[code]`:

**Flow States:**
1. **Loading** - Neural network activation (PremiumLoading)
2. **Form** - Glass morphism registration with password strength
3. **Success** - Account created confirmation
4. **Onboarding** - 72-second consciousness journey
5. **Dashboard** - Redirect to main interface

**Features:**
- Invite code validation
- Genesis 100 / Early Access / Beta badges
- Email, display name, password fields
- Password strength meter (Weak → Excellent)
- Terms & Privacy checkboxes
- Glass morphism card design
- Background gradient animations

---

## Design System

### Colors
- **Gold**: `#C9A962` - Primary accent
- **Navy**: `#0A1828` - Background
- **Teal**: `#2A9D8F` - Secondary accent
- **White/60**: Labels and secondary text
- **White/40**: Placeholder text

### Typography
- **Serif** (Playfair Display): Headlines
- **Sans** (Inter): UI elements

### Glass Morphism
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(201, 169, 98, 0.2);
}
```

### Animations
- **Framer Motion**: Page transitions, micro-interactions
- **SVG Path Animation**: Sacred geometry draw-on effects
- **CSS**: Pulse, glow, gradient shifts

---

## Source Inspiration

These components were migrated and enhanced from:

| Component | Source Prototype |
|-----------|-----------------|
| OnboardingJourney | `front-end/onboarding_journey.html` |
| PremiumLoading | `front-end/bizra_loading.html` |
| SacredGeometryInterface | `front-end/sacred_geometry_interface.html` |

Original prototypes used:
- **Vanta.js**: FOG, BIRDS, NET backgrounds
- **Three.js**: 3D rendering
- **Vanilla JS**: Animations

React versions use:
- **Framer Motion**: Animation library
- **SVG**: Sacred geometry shapes
- **CSS**: Gradients, blur effects

---

## Usage Example

Complete invite flow integration:

```tsx
// pages/invite/premium/[code].tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { PremiumLoading, OnboardingJourney } from '@/components/onboarding';

export default function PremiumInvitePage() {
  const [state, setState] = useState<'loading' | 'form' | 'onboarding'>('loading');
  const router = useRouter();

  if (state === 'loading') {
    return (
      <PremiumLoading
        duration={5000}
        onComplete={() => setState('form')}
      />
    );
  }

  if (state === 'onboarding') {
    return (
      <OnboardingJourney
        onComplete={() => router.push('/dashboard')}
      />
    );
  }

  return (
    <form onSubmit={() => setState('onboarding')}>
      {/* Registration form */}
    </form>
  );
}
```
