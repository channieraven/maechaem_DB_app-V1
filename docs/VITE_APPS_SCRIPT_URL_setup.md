# GitHub Actions Variable Documentation

## Setting Up VITE_APPS_SCRIPT_URL

To ensure that the `VITE_APPS_SCRIPT_URL` variable is correctly incorporated during the Vite build process and accessible via `import.meta.env.VITE_APPS_SCRIPT_URL` on GitHub Pages, follow these steps:

1. **Define the Environment Variable**:
   In your GitHub repository, go to `Settings` > `Secrets and variables` > `Actions` and click on the **Variables** tab, then click `New repository variable`.
   - **Name**: `VITE_APPS_SCRIPT_URL`
   - **Value**: Your Apps Script URL (e.g. `https://script.google.com/macros/s/.../exec`)

   > **Note**: Use the **Variables** tab (not Secrets). Variables are non-sensitive configuration values injected at build time via `${{ vars.VARIABLE_NAME }}`.

2. **GitHub Actions Workflow**:
   The `pages.yml` workflow already injects the variable during the build step:
   ```yaml
   - name: Build
     env:
       VITE_APPS_SCRIPT_URL: ${{ vars.VITE_APPS_SCRIPT_URL }}
     run: npm run build -- --base ${{ steps.setup_pages.outputs.base_path }}
   ```

3. **Frontend usage**:
   The variable is read in `constants.ts` as:
   ```ts
   export const APPSCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || '<fallback-url>';
   ```
   All auth and data calls in the frontend use this constant via `services/sheetsService.ts`.

### Notes
- Replace the fallback URL in `constants.ts` with your actual Apps Script deployment URL if you want a default for local development.
- Test the configuration to ensure that it works as expected on GitHub Pages.
