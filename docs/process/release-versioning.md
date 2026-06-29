# Release versioning (conventional commits → release-please)

How version numbers are chosen in **core-fe**. You do not set versions by hand — conventional-commit prefixes drive release-please on **`dev`** (prerelease) and **`main`** (stable).

Branch flow: [git-workflow.md](git-workflow.md). CI/deploy: [cicd-and-netlify.md](../deployment/cicd-and-netlify.md).

## Commit prefix → bump

| Commit message                                     | Bump       | Example (from `1.0.0-alpha.0`) |
| -------------------------------------------------- | ---------- | ------------------------------ |
| `fix: …`                                           | patch      | `1.0.0 → 1.0.1`                |
| `feat: …`                                          | minor      | `1.0.0 → 1.1.0`                |
| `feat!: …` or `BREAKING CHANGE:` footer            | major      | `1.0.0 → 2.0.0`                |
| `docs:` · `chore:` · `refactor:` · `ci:` · `test:` | none alone | changelog only                 |

## Two channels

| Channel     | Branch | GitHub environment | Config                                   |
| ----------- | ------ | ------------------ | ---------------------------------------- |
| Development | `dev`  | `development`      | `.github/release-please/config.dev.json` |
| Production  | `main` | `production`       | `.github/release-please/config.json`     |

After a stable release on `main`, post-merge CI deploys to Netlify production and may back-merge `main` → `dev` (see `post-release-backmerge.yml`).
