Playwright smoke test

Install Playwright and run smoke tests (PowerShell):

# Install Playwright (this will also download browsers)
npm install --save-dev @playwright/test
npx playwright install

# Run smoke tests
npm run test:smoke

Results and screenshots are in `test-results/screenshots` and HTML report in `test-results/playwright-report`.
