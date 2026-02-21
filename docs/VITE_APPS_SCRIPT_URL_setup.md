# GitHub Actions Variable Documentation

## Setting Up VITE_APPS_SCRIPT_URL

To ensure that the `VITE_APPS_SCRIPT_URL` variable is correctly incorporated during the Vite build process and accessible via `import.meta.env.VITE_APPS_SCRIPT_URL` on GitHub Pages, follow these steps:

1. **Define the Environment Variable**: 
   In your GitHub repository, go to `Settings` > `Secrets and variables` > `Actions` and click on `New repository secret`.
   - **Name**: `VITE_APPS_SCRIPT_URL`
   - **Value**: Your Apps Script URL (e.g. `https://script.google.com/...`)

2. **Update GitHub Actions Workflow**:
   Make sure that in your GitHub Actions workflow (typically located in `.github/workflows/`), you reference the secret as follows:
   ```yaml
   env:
     VITE_APPS_SCRIPT_URL: ${{ secrets.VITE_APPS_SCRIPT_URL }}
   ```

3. **Modify pages.yml**: Ensure your `pages.yml` is set up to inject the variable during the build process. It should include a section to pass through the environment variable, like so:
   ```yml
   build:
     env:
       VITE_APPS_SCRIPT_URL: ${{ secrets.VITE_APPS_SCRIPT_URL }}
   ```

By following these steps, the `VITE_APPS_SCRIPT_URL` variable will be correctly injected during the build process and be available for use in your app. 

### Notes
- Make sure to replace the placeholder for the URL with your actual Apps Script URL.
- Test the configuration to ensure that it works as expected on GitHub Pages.