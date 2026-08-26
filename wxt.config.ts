import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['storage', 'tabs', 'sidePanel','scripting'],
    host_permissions: [
      '*://app.jobcakes.com/*',
      '*://jobcakes.com/*',
      '*://*.jobcakes.com/*',
      'http://127.0.0.1:8980/*',
      'http://localhost:8980/*',
    ],
  },
});
