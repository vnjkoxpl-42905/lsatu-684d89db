# Verification checklist

Run before declaring an LSAT U change complete. Skip items that genuinely do not apply.

## Build and static checks

- [ ] `npm run lint` passes (or only pre-existing warnings remain)
- [ ] `npm run test` passes for affected areas
- [ ] `npm run build` succeeds
- [ ] `npx tsc --noEmit -p tsconfig.app.json` clean for touched files (no typecheck script)

## Behavior

- [ ] The exact change requested works on the real route
- [ ] Error path tested, not just the happy path
- [ ] No errors swallowed (throw / rethrow / return failure / toast, never silent)
- [ ] Adjacent surfaces did not regress

## Product integrity

- [ ] No fake data, fake analytics, dead buttons, or misleading placeholders
- [ ] Foyer remains primary nav; dock only on `/foyer`
- [ ] Identity rules intact (email sign-in, name not username, instructor = "Joshua")
- [ ] Feature gating respected (`has_*_access`, admin)

## Responsiveness

- [ ] Desktop verified
- [ ] Mobile (375x812) verified, especially admin and primary surfaces

## Evidence

- [ ] Screenshot / console / Playwright trace / MCP report captured where relevant
- [ ] Handoff updated in `docs/agent/handoffs/` if crossing lanes
