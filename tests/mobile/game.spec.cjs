const {test, expect, waitForPicker, openPicker, openFirstLevel, edgeCount,
    dispatchTouch, tap} = require('./helpers.cjs');

test('touch picker enforces locks and remembers Home Screen tip dismissal', async ({page}) => {
    await openPicker(page);
    await expect(page.locator('.homeScreenTip')).toBeVisible();
    await tap(page, page.locator('.closeTip'));
    await expect(page.locator('.homeScreenTip')).toHaveCount(0);
    await page.reload();
    await waitForPicker(page);
    await expect(page.locator('.homeScreenTip')).toHaveCount(0);
    await tap(page, page.locator('.thumbnail').nth(1));
    await expect(page.locator('#game')).toHaveCSS('display', 'none');
    await openFirstLevel(page);
});

test('native taps use Hint, Undo and Easy Mode; edges survive reload', async ({page}) => {
    await openPicker(page);
    await openFirstLevel(page);
    await page.evaluate(() => document.getElementById('gameHint').addEventListener('touchstart',
	event => { window.lastHintTouchWasTrusted = event.isTrusted; }, {once: true}));
    await tap(page, page.locator('#gameHint'));
    expect(await page.evaluate(() => window.lastHintTouchWasTrusted)).toBe(true);
    await expect.poll(() => edgeCount(page)).toBe(1);
    await tap(page, page.locator('#gameUndo'));
    await expect.poll(() => edgeCount(page)).toBe(0);
    await tap(page, page.locator('#gameHint'));
    const checkbox = page.locator('#gameEasyMode input');
    await tap(page, checkbox);
    await expect(checkbox).toBeChecked();
    expect(await page.evaluate(() => game.easyMode)).toBe(true);
    await tap(page, checkbox);
    await expect(checkbox).not.toBeChecked();
    await page.reload();
    await waitForPicker(page);
    await openFirstLevel(page);
    expect(await edgeCount(page)).toBe(1);
    await tap(page, page.locator('.gameBackButton'));
    await expect(page.locator('#levelPicker')).toBeVisible();
});

test('save code can restore progress through the real dialog', async ({page}) => {
    await openPicker(page);
    await openFirstLevel(page);
    await tap(page, page.locator('#gameHint'));
    await tap(page, page.locator('#gameHint'));
    expect(await edgeCount(page)).toBe(2);
    await tap(page, page.locator('.gameBackButton'));
    await tap(page, page.getByRole('button', {name: 'Save Code', exact: true}));
    await expect(page.locator('.saveCodeOut')).toHaveValue(/^ML[01]-/);
    const code = await page.locator('.saveCodeOut').inputValue();
    await page.evaluate(() => localStorage.removeItem('MissingLink_progress'));
    await page.reload();
    await waitForPicker(page);
    await tap(page, page.getByRole('button', {name: 'Save Code', exact: true}));
    await page.locator('.saveCodeIn').fill(code);
    page.once('dialog', dialog => dialog.accept());
    await Promise.all([
	page.waitForEvent('load'),
	tap(page, page.getByRole('button', {name: 'Load Code', exact: true})),
    ]);
    await waitForPicker(page);
    await openFirstLevel(page);
    expect(await edgeCount(page)).toBe(2);
});

test('rotation preserves normalized geometry and connected edges', async ({page}) => {
    await openPicker(page);
    await openFirstLevel(page);
    await tap(page, page.locator('#gameHint'));
    const before = await page.evaluate(() => JSON.parse(game.graph.saveToJson()));
    const size = page.viewportSize();
    await page.setViewportSize({width: size.height, height: size.width});
    await expect.poll(() => page.evaluate(() =>
	game.width === innerWidth && game.height === innerHeight)).toBe(true);
    const after = await page.evaluate(() => JSON.parse(game.graph.saveToJson()));
    expect(after.tris).toEqual(before.tris);
    expect(after.dots).toHaveLength(before.dots.length);
    for (let i = 0; i < before.dots.length; i++) {
	expect(after.dots[i].x).toBeCloseTo(before.dots[i].x, 10);
	expect(after.dots[i].y).toBeCloseTo(before.dots[i].y, 10);
    }
    expect(await edgeCount(page)).toBe(1);
    expect(await page.evaluate(() => game.mouseHandler.zoomLevel)).toBe(1);
    await tap(page, page.locator('#gameUndo'));
    expect(await edgeCount(page)).toBe(0);
});

test('synthetic touch drag connects dots and a two-finger pinch cancels a pending edge', async ({page}) => {
    await openPicker(page);
    await openFirstLevel(page);
    // Use a small, controlled level for gestures; production assets stay untouched.
    const points = await page.evaluate(() => {
	game.setProgressCallback(null);
	game.loadFromJson(JSON.stringify({version: 2,
	    dots: [{x: .2, y: .2}, {x: .8, y: .2}, {x: .2, y: .8}],
	    tris: [{corners: [0, 1, 2], color: {red: 10, green: 20, blue: 30}}],
	}));
	return game.graph.dots.map((dot, i) => {
	    dot.circle.node.setAttribute('data-test-dot', String(i));
	    const p = new DOMPoint(dot.x, dot.y).matrixTransform(game.draw.node.getScreenCTM());
	    return {identifier: i, clientX: p.x, clientY: p.y, pageX: p.x+scrollX, pageY: p.y+scrollY};
	});
    });
    const dot = page.locator('[data-test-dot="0"]');
    await dispatchTouch(dot, 'touchstart', [points[0]]);
    await dispatchTouch(dot, 'touchmove', [{...points[1], identifier: 0}]);
    await dispatchTouch(dot, 'touchend', [], [{...points[1], identifier: 0}]);
    expect(await edgeCount(page)).toBe(1);

    await dispatchTouch(dot, 'touchstart', [points[0]]);
    await dispatchTouch(dot, 'touchmove', [{...points[0],
	clientY: points[0].clientY+20, pageY: points[0].pageY+20}]);
    expect(await page.evaluate(() => Boolean(game.activeEdge))).toBe(true);
    const svg = page.locator('#game svg.graph');
    const center = {x: (points[0].clientX+points[1].clientX)/2, y: points[0].clientY+60};
    const pair = distance => [-1, 1].map((sign, i) => ({identifier: i,
	clientX: center.x+sign*distance, clientY: center.y,
	pageX: center.x+sign*distance, pageY: center.y}));
    await dispatchTouch(svg, 'touchstart', pair(30));
    expect(await page.evaluate(() => game.activeEdge)).toBe(null);
    await dispatchTouch(svg, 'touchmove', pair(60));
    expect(await page.evaluate(() => game.mouseHandler.zoomLevel)).toBeCloseTo(2, 8);
    await dispatchTouch(svg, 'touchend', [], pair(60));
    expect(await page.evaluate(() => game.mouseHandler.state)).toBe(null);
    expect(await edgeCount(page)).toBe(1);
});

test('simulated Home Screen mode suppresses the Safari storage tip', async ({page}) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', {value: true}));
    await openPicker(page);
    await expect(page.locator('.homeScreenTip')).toHaveCount(0);
});

// Desktop WebKit hit-tests correctly after a rotation, so the iOS Home Screen
// bug (a page left shifted up by the status bar, making taps land low) cannot
// happen here. Fake the shift instead: make the page scrollable, scroll it by
// 59px, rotate and rotate back, then check that viewport.js put it back.
// WebKit reports that scroll as a visualViewport scroll, which viewport.js
// would undo at once; hold those events back until the rotation starts.
// Call holdViewportScrolls before the page loads.
async function holdViewportScrolls(page) {
    await page.addInitScript(() => {
	window.holdViewportScrolls = false;
	window.visualViewport.addEventListener('scroll', event => {
	    if (window.holdViewportScrolls) event.stopImmediatePropagation();
	});
    });
}

async function rotateWithStuckOffset(page) {
    await page.evaluate(async () => {
	const spacer = document.createElement('div');
	spacer.id = 'testSpacer';
	spacer.style.height = '3000px';
	document.body.append(spacer);
	window.holdViewportScrolls = true;
	window.scrollTo(0, 59);
	await new Promise(resolve => setTimeout(resolve, 200));
    });
    // Test setup: the page can be shifted.  (On a shrunken 980px layout,
    // WebKit rounds the scroll to whole device pixels.)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(50);
    await page.evaluate(() => window.holdViewportScrolls = false);
    const size = page.viewportSize();
    await page.setViewportSize({width: size.height, height: size.width});
    await page.waitForTimeout(300);
    await page.setViewportSize(size);
    await page.waitForTimeout(1000);
    return page.evaluate(() => {
	// Measured with the spacer still there: removing it would clamp the
	// scroll to 0 by itself.
	const result = {scrollY: window.scrollY,
	    pageTop: Math.round(document.documentElement.getBoundingClientRect().top),
	    buttons: 0, missed: []};
	for (const button of document.querySelectorAll('button')) {
	    const rect = button.getBoundingClientRect();
	    if (!rect.width || !rect.height) continue;
	    result.buttons++;
	    const hit = document.elementFromPoint(rect.left + rect.width/2, rect.top + rect.height/2);
	    if (!button.contains(hit)) result.missed.push(button.id || button.textContent);
	}
	document.getElementById('testSpacer').remove();
	return result;
    });
}

test('a page shifted during a rotation is put back so buttons can be tapped', async ({page}) => {
    await holdViewportScrolls(page);
    await openPicker(page);
    let after = await rotateWithStuckOffset(page);
    expect(after).toEqual({scrollY: 0, pageTop: 0, buttons: after.buttons, missed: []});
    expect(after.buttons).toBeGreaterThan(0);
    await openFirstLevel(page);
    after = await rotateWithStuckOffset(page);
    expect(after).toEqual({scrollY: 0, pageTop: 0, buttons: after.buttons, missed: []});
    expect(after.buttons).toBeGreaterThan(0);
    await tap(page, page.locator('#gameHint'));
    expect(await edgeCount(page)).toBe(1);
});

// R25 remains open: run explicitly with test:mobile:known. This is a desired
// behavior assertion, not a test that codifies the current shrunken layout.
test('@known R25 device page uses its CSS viewport without automatic shrinking', async ({page}, testInfo) => {
    await openPicker(page);
    const viewport = await page.evaluate(() => ({width: innerWidth, height: innerHeight,
	visualWidth: visualViewport.width, scale: visualViewport.scale,
	userAgent: navigator.userAgent, touchPoints: navigator.maxTouchPoints}));
    await testInfo.attach('mobile-viewport', {
	body: JSON.stringify({device: page.viewportSize(), actual: viewport}, null, 2),
	contentType: 'application/json',
    });
    expect(viewport.width).toBeCloseTo(page.viewportSize().width, 0);
    expect(viewport.scale).toBeCloseTo(1, 2);
});
