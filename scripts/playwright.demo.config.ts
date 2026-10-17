// One-off generator for public/examples/demo.bcfzip: npx playwright test -c scripts/playwright.demo.config.ts
import base from '../playwright.config';
export default {
  ...base,
  testDir: '.',
  testMatch: 'make-demo-bcf.spec.ts',
  workers: 1,
  timeout: 7_200_000,
  webServer: { ...(base.webServer as object), cwd: '..' },
};
