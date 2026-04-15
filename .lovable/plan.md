

## Plan: Add Bento Grid Feature Section Component

### Problem
The pasted code is from an Aceternity/Next.js template. It uses `next/image`, `next/link`, and `cobe` (globe library), and the JSX was stripped during copy-paste (all tags are missing). It needs to be adapted for this React+Vite project.

### What I will do

**1. Install missing dependencies**
- `cobe` (3D globe renderer)
- `@tabler/icons-react` (icon library)
- `framer-motion` is already installed

**2. Create `src/components/ui/feature-section-with-bento-grid.tsx`**
Adapt the Aceternity component for React+Vite:
- Replace `next/image` with standard `<img>` tags
- Replace `next/link` with React Router `<Link>` or `<a>`
- Reconstruct all the missing JSX (the pasted code lost all its HTML/JSX tags)
- Rebuild the full component tree: `FeaturesSectionWithBentoGrid`, `FeatureCard`, `FeatureTitle`, `FeatureDescription`, `SkeletonOne` through `SkeletonFour`, and `Globe`
- Keep all Tailwind classes, motion animations, and the cobe globe logic intact

### Files
| Action | File |
|--------|------|
| Install | `cobe`, `@tabler/icons-react` |
| Create | `src/components/ui/feature-section-with-bento-grid.tsx` |

The component will be ready to import and use anywhere in the app. No demo page will be created unless requested.

