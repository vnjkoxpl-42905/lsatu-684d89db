# Project Mandates

## Maximum Autonomy Rule
Operate with maximum available autonomy. 
- **No Pre-Authorization:** Do not ask before reading files, editing files, running terminal commands, or performing lifecycle actions (install, build, test, commit, push).
- **Resource Access:** Automatically access project-related files, local notes, screenshots, Obsidian, Google Drive folders, or connected repo files when relevant.
- **Permission Prompts:** Always choose the most permissive option (e.g., "Allow permanently" or "Allow for this session").
- **Automatic Execution:** Proceed automatically unless explicitly told “ask first,” “plan only,” or “do not edit.”

## Default Delivery Workflow
After completing any code fix or modification:
1. **Fix:** Implement the requested changes.
2. **Build:** Run `npm run build` to verify integrity.
3. **Stage:** `git add <files>` (stage intended changes).
4. **Commit:** `git commit -m "<descriptive message>"`
5. **Push:** push your own branch (`git push origin <branch>`) and open a PR. Never push directly to `main`, and merge to `main` only when Joshua says so.
6. **Publish:** after a change lands on `main`, publish with the free Lovable `deploy_project` (project `53b9a6f2-aba7-4ae4-8dd1-fa5b8aab4d76`) without asking. First check `get_project` `latest_commit_sha` equals the merged HEAD, then confirm the `index-*` bundle hash on lsatprep.study changed and a commit-only string is present. This is not an authorization to merge to `main`, deploy edge functions, or spend credits. Full text: `CLAUDE.md`.

## Final Reporting Structure
After every delivery, provide a summary including:
- **What changed:** Brief description of the fix/feature.
- **Files changed:** List of modified files.
- **Build result:** Success/failure of the build step.
- **Commit hash:** The resulting commit ID.
- **Whether pushed:** Confirmation of push, with the branch name and PR link.
