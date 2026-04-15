

## Plan: Fix Double Modal Overlay on Forgot Password

### Problem
When you click "Forgot?" on the sign-in form, the forgot-password modal (z-60/61) opens **on top of** the still-visible auth modal (z-40/50). Two glass panels stack, creating the red/overlapping box effect.

### Root Cause
`forgotOpen` is set to `true` but `modalOpen` remains `true`. Both modals render simultaneously with their own backdrop + glass shell.

### Fix (single file: `src/pages/Auth.tsx`)

**1. Hide the auth modal when forgot-password opens**
- On "Forgot?" button click (line 451): set `modalOpen(false)` alongside `setForgotOpen(true)`

**2. Restore the auth modal when forgot-password closes**
- On forgot-password close (backdrop click line 584, X button line 596, and after successful submit line 250): set `modalOpen(true)` alongside `setForgotOpen(false)`

This is a 4-line change. The forgot-password modal becomes the only visible panel, no stacking.

