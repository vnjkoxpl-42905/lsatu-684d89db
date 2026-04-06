

## Plan: Set Up PWA (Installable Web App) for Mobile

### What You'll Get
Your LSAT U app will be installable directly from the phone browser to the home screen — it will launch full-screen like a native app, work offline, and load fast.

### Steps

**1. Install `vite-plugin-pwa`**
Add the `vite-plugin-pwa` package as a dependency.

**2. Configure Vite for PWA**
Update `vite.config.ts` to add the PWA plugin with:
- App name: "LSAT U"
- Theme color matching the dark background (#000000)
- Proper manifest with icons, start URL pointing to `/foyer`
- `navigateFallbackDenylist` excluding `/~oauth` so Google Sign-In keeps working
- Runtime caching for the data JSON files

**3. Add PWA Icons**
Create placeholder PWA icons at `public/pwa-192x192.png` and `public/pwa-512x512.png` (simple branded icons).

**4. Update `index.html`**
Add mobile-optimized meta tags:
- `apple-mobile-web-app-capable`
- `apple-mobile-web-app-status-bar-style`
- `theme-color`
- Apple touch icon link

**5. Mobile Responsive Audit & Fixes**
Review key pages (Auth, Foyer/OrbitalHub, Drill, Bootcamps) for mobile layout issues and fix:
- Ensure the orbital hub scales properly on small screens
- Auth page fits within mobile viewport
- Navigation and buttons are touch-friendly sized

**6. Optional: Add `/install` page**
A simple page with instructions for installing the app, which can trigger the browser's install prompt on supported devices.

### Technical Details
- Plugin: `vite-plugin-pwa` with `registerType: 'autoUpdate'`
- Service worker strategy: `generateSW` (auto-generated)
- OAuth protection: `navigateFallbackDenylist: [/^\/~oauth/]`
- Files changed: `vite.config.ts`, `index.html`, new icon files, potential responsive fixes across components

