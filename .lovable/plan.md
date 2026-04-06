

## Smoother, slower, more fluid background paths

The current `FloatingPaths` animation has two issues causing choppiness:

1. **Cubic bezier paths use degenerate control points** -- the first control point equals the start point, making the curve's initial segment a straight line before bending sharply. Adding proper offsets to control points will produce smoother curves.

2. **Animation uses `pathOffset` cycling 0→1→0 with `linear` easing** -- this creates a mechanical, choppy feel. Switching to a smoother easing (`easeInOut`) and increasing duration will make it more fluid.

### Changes (single file: `src/components/ui/background-paths.tsx`)

**Path geometry**: Offset the first cubic bezier control point so curves flow more naturally instead of starting with a flat segment. Add a slight vertical offset to the first control point.

**Animation tweaks**:
- Increase base duration from `20` to `35` seconds (with random spread `+ Math.random() * 15`) to slow it down
- Change `ease` from `"linear"` to `"easeInOut"` for smoother acceleration/deceleration
- Narrow the opacity pulse range from `[0.3, 0.6, 0.3]` to `[0.3, 0.5, 0.3]` to reduce visual flickering
- Set `pathLength` initial to `0.5` (from `0.3`) so paths don't appear to "grow from nothing"
- Use `strokeLinecap="round"` and `strokeLinejoin="round"` on each path for smoother line endings

