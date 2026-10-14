# Verify conditional learning without assigning a student

Run `npx vite --config e2e/conditionals-fixture/vite.config.ts`, then open `http://127.0.0.1:8097/bootcamp/conditionals`.

This fixture renders the actual bootcamp page, routes, content, persistence hook and teacher targeting fields. Only authentication and Supabase transport are replaced. Two local actors and localStorage-backed acknowledged writes allow reload, account-switch, failure and retry checks without touching production records. The production Vite configuration never imports this fixture or its authentication substitute.

Check the full path, each targeted area and difficulty, guided work, explanation assistance, practice resume, optional timing, review, journal, settings and inline preview. Check narrow, medium, wide and docked widths. The failure control makes the next save fail; restoring cloud and Retry save must retain the draft. Component tests cover revision conflicts and delayed responses that cannot be reliably triggered by ordinary clicking.

Passing this fixture does not establish production sign-in, delivery of a real student assignment, cross-device save acceptance or publication. Verify those separately where authorized.
