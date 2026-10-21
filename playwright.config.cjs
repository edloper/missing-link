const {defineConfig, devices} = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests/mobile',
    testMatch: '**/*.spec.cjs',
    // server.py is single-threaded; avoid launching multiple device pages at once.
    workers: 1,
    fullyParallel: false,
    retries: 0,
    timeout: 60000,
    expect: {timeout: 10000},
    reporter: [['list'], ['html', {open: 'never'}]],
    use: {
	baseURL: 'http://127.0.0.1:8001',
	actionTimeout: 10000,
	navigationTimeout: 15000,
	browserName: 'webkit',
	trace: 'retain-on-failure',
	screenshot: 'only-on-failure',
    },
    projects: [
	{name: 'iphone-portrait', use: {...devices['iPhone 13']}},
	{name: 'iphone-landscape', use: {...devices['iPhone 13 landscape']}},
	{name: 'ipad-portrait', use: {...devices['iPad (gen 7)']}},
	{name: 'ipad-landscape', use: {...devices['iPad (gen 7) landscape']}},
    ],
    webServer: {
	command: 'python server.py 8001',
	url: 'http://127.0.0.1:8001',
	reuseExistingServer: !process.env.CI,
	timeout: 15000,
	stdout: 'ignore',
	stderr: 'ignore',
    },
});
