

## Plan: Loosen Password Requirements

### Problem
Two layers of strictness:
1. **Client-side zod validation** requires uppercase, lowercase, AND a number
2. **Backend HIBP check** rejects passwords found in breach databases ("Password is known to be weak and easy to guess")

Both together make it very hard to pick an accepted password.

### Changes

**1. Relax client-side validation (`src/contexts/AuthContext.tsx`)**
- Remove the uppercase regex requirement
- Remove the lowercase regex requirement
- Remove the number regex requirement
- Keep only `min(6)` and `max(100)` — simple length check

**2. Disable HIBP check on the backend**
- Use the `configure_auth` tool to set `password_hibp_enabled: false`
- This stops the "known to be weak" rejection

### Result
Users only need a password that is 6+ characters. No special character requirements, no breach database checks.

