const {test: base, expect} = require('@playwright/test');

// Playwright creates a fresh browser context/storage for every test.
const test = base.extend({
    pageErrors: [async ({page}, use) => {
	const errors = [];
	page.on('pageerror', error => errors.push(error.message));
	await use(errors);
	expect(errors, 'uncaught errors on the actual game page').toEqual([]);
    }, {auto: true}],
});

async function waitForPicker(page) {
    await page.waitForFunction(() => typeof game === 'object' &&
	window.jQuery && $._data(document.querySelector('.thumbnail'), 'events')?.click,
	null, {timeout: 10000});
    await expect(page.locator('#splashscreen')).toBeHidden();
    await expect(page.locator('#levelPicker')).toBeVisible();
}

async function openPicker(page) {
    await page.goto('/game_fullscreen.html');
    await waitForPicker(page);
}

async function openFirstLevel(page) {
    await tap(page, page.locator('.thumbnail').first());
    // The fullscreen container has zero height; its visible SVG is absolute.
    await expect(page.locator('#game')).toHaveCSS('display', 'block');
    await expect(page.locator('#game svg.graph')).toBeVisible();
    await page.waitForFunction(() => game.graph.dots.length > 0);
}

async function tap(page, locator) {
    await expect(locator).toBeVisible();
    await locator.scrollIntoViewIfNeeded();
    // Windows WebKit's native input uses visual CSS pixels. Locator.tap does
    // not compensate for legacy pages that auto-shrink a 980px layout viewport.
    // Keep the actual page unchanged and map its DOM position to the screen.
    const point = await locator.evaluate(element => {
	const rect = element.getBoundingClientRect();
	const viewport = window.visualViewport;
	return {x: (rect.x+rect.width/2-viewport.offsetLeft) * viewport.scale,
	    y: (rect.y+rect.height/2-viewport.offsetTop) * viewport.scale};
    });
    await page.touchscreen.tap(point.x, point.y);
}

async function edgeCount(page) {
    return page.evaluate(() => game.graph.edges.filter(edge => edge.end).length);
}

async function dispatchTouch(locator, type, touches, changedTouches = touches) {
    await locator.dispatchEvent(type, {
	bubbles: true, cancelable: true, touches, targetTouches: touches, changedTouches,
    });
}

module.exports = {test, expect, waitForPicker, openPicker, openFirstLevel, edgeCount, dispatchTouch, tap};
