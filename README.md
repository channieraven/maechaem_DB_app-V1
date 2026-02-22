## CI / Continuous Integration

A GitHub Actions workflow (`.github/workflows/ci.yml`) runs automatically on every **push** and **pull request**:

| Step | Details |
|------|---------|
| Install | Uses `npm ci` when a lockfile is present, otherwise `npm install`. |
| Lint | Runs `npm run lint` if that script is defined in `package.json`; otherwise skipped. |
| Test | Runs `npm test` in CI mode if a `test` script is defined; otherwise skipped. |
| Build | Always runs `npm run build` to confirm the production build succeeds. |

Node.js LTS is used, and `npm` dependencies are cached between runs.

---

## GitHub Pages Deployment

A second workflow (`.github/workflows/pages.yml`) builds the app and deploys it to **GitHub Pages** automatically on every push to the **`main`** (or **`master`**) branch. You can also trigger it manually from the **Actions** tab.

### Live URL

Once the workflow runs successfully, the site is available at:

```
https://channieraven.github.io/maechaem_DB_app-V1/
```

> **Note:** If you fork or rename this repository, replace `channieraven` and `maechaem_DB_app-V1` with your GitHub username and repository name respectively.

You can open this URL on your phone or any device — no computer required.

### How it works

1. Checks out the code and installs dependencies.
2. Runs `npm run build` (Vite outputs to `dist/`) with the correct `--base` path for GitHub Pages.
3. Uploads the `dist/` folder as a Pages artifact.
4. Deploys it with the official `actions/deploy-pages` action.

### Required GitHub repository settings

In your repository go to **Settings → Pages** and set **Source** to **"GitHub Actions"** — this is required for the deploy workflow to work.

---

## Security — GEMINI_API_KEY

> ⚠️ **Do not expose your Gemini API key in the client-side bundle.**

When the app is deployed as a static site on GitHub Pages, any value baked into the JavaScript bundle is publicly readable. A few safe options:

- **Backend proxy (recommended):** Keep the key in a server-side environment variable (e.g. in the existing `server.js` / `proxy-server.cjs`) and route all Gemini requests through that proxy. Never pass the key to the Vite build.
- **GitHub Actions secret (build-time only):** If the key is *only* needed at build time (e.g. for static generation), add it as a repository secret (`Settings → Secrets → Actions`) and reference it as `${{ secrets.GEMINI_API_KEY }}` in the workflow — it will **not** appear in the deployed output.
- **Do not** commit `.env.local` or any file containing real API keys to the repository.

trigger deploy 3
