---
description: Merge a PR once CI is green and approvals are in
argument-hint: <pr-number>
allowed-tools: Bash(git*), Bash(gh*)
---

Merge PR **$ARGUMENTS** safely:

1. Confirm CI is green (all required checks pass — especially **`quality-gate`**) and the required approvals are present.
2. Confirm there are no merge conflicts and the branch is up to date with **`dev`** (for PRs targeting `dev`).
3. Merge via `gh pr merge <n> --squash` (squash unless told otherwise); keep the conventional title.
4. Report the merge result.

Do not merge if any required check is failing or approvals are missing — report what is blocking instead.
