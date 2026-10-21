const {test, expect} = require('@playwright/test');

test('existing 39 browser regressions pass in WebKit', async ({page}, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/tests/browser.html');
    await page.waitForFunction(() => window.testResults?.done, null, {timeout: 55000});
    const result = await page.evaluate(() => window.testResults);
    await testInfo.attach('browser-regressions', {
	body: JSON.stringify(result, null, 2), contentType: 'application/json',
    });
    expect(result.results.filter(item => item.status !== 'PASS')).toEqual([]);
    expect(result.passed).toBe(39);
    expect(errors).toEqual([]);
});
