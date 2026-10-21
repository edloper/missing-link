const TEST_LEVEL = {
    version: 2,
    dots: [{x: .1, y: .1}, {x: .9, y: .1}, {x: .1, y: .9}, {x: .9, y: .9}],
    tris: [
	{corners: [0, 1, 2], color: {red: 10, green: 20, blue: 30}},
	{corners: [1, 2, 3], color: {red: 40, green: 50, blue: 60}},
    ],
    extras: {title: 'Browser fixture', backgroundColor: {h: 180, s: 50, l: 90}},
};

function equal(actual, expected, message = '') {
    const sorted = value => {
	if (Array.isArray(value)) { return value.map(sorted); }
	if (value !== null && typeof value === 'object') {
	    return Object.fromEntries(Object.keys(value).sort().map(key => [key, sorted(value[key])]));
	}
	return value;
    };
    if (JSON.stringify(sorted(actual)) !== JSON.stringify(sorted(expected))) {
	throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
}
function ok(value, message) { if (!value) { throw new Error(message); } }
function screenPoint(draw, point) {
    return new DOMPoint(point.x, point.y).matrixTransform(draw.node.getScreenCTM());
}
function mouseEvent(node, type, point, options = {}) {
    node.dispatchEvent(new MouseEvent(type, {bubbles: true, cancelable: true,
	clientX: point.x, clientY: point.y, ...options}));
}
function touchEvent(node, type, point) {
    const touch = {clientX: point.x, clientY: point.y, pageX: point.x, pageY: point.y};
    const event = new Event(type, {bubbles: true, cancelable: true});
    for (const key of ['touches', 'targetTouches', 'changedTouches']) {
	Object.defineProperty(event, key, {value: type === 'touchend' && key !== 'changedTouches' ? [] : [touch]});
    }
    node.dispatchEvent(event);
}
async function waitUntil(predicate, message, timeout = 4000) {
    const deadline = performance.now() + timeout;
    while (!predicate()) {
	if (performance.now() > deadline) { throw new Error(message); }
	await new Promise(resolve => setTimeout(resolve, 20));
    }
}

window.runTests = async function(group, report) {
    ok(typeof $ === 'function' && typeof SVG === 'function' && $.fn.slider,
       'CDN dependencies must load before tests can run');
    const tests = [];
    const test = (name, run, issue = null) => tests.push({name, run, issue});
    const container = document.getElementById('fixture');
    let reset = () => {};

    if (group === 'game') {
	const game = new Game(container, 600, 400);
	// Record completion without spawning hundreds of decorative SVG elements.
	game.levelComplete = () => {};
	reset = () => {
	    game.cancelDrag();
	    game.mouseHandler.state = null;
	    game.setProgressCallback(null);
	    game.resize(600, 400);
	    game.loadFromJson(JSON.stringify(TEST_LEVEL));
	    game.show();
	};
	test('SVG renders dots, their labels and initially hidden triangles', () => {
	    equal(game.graph.dots[0].text.node.textContent, '2');
	    equal(game.graph.tris[0].polygon.node.style.display, 'none');
	    equal(game.graph.dots[0].circle.node.getAttribute('fill'), 'white');
	});
	test('real mouse drag adds an edge and clicking its SVG line removes it', () => {
	    const [a, b] = game.graph.dots;
	    const start = screenPoint(game.draw, a), end = screenPoint(game.draw, b);
	    mouseEvent(a.circle.node, 'mousedown', start);
	    mouseEvent(document, 'mousemove', end);
	    mouseEvent(document, 'mouseup', end);
	    equal(game.graph.edges.length, 1);
	    const edge = game.graph.edges[0];
	    const middle = {x: (start.x+end.x)/2, y: (start.y+end.y)/2};
	    mouseEvent(edge.line.node, 'mousedown', middle);
	    mouseEvent(document, 'mouseup', middle);
	    equal(game.graph.edges.length, 0);
	});
	test('Hint button adds an edge and Undo button removes it', () => {
	    mouseEvent(document.getElementById('gameHint'), 'mousedown', {x: 0, y: 0});
	    mouseEvent(window, 'mouseup', {x: 0, y: 0});
	    equal(game.graph.edges.length, 1);
	    mouseEvent(document.getElementById('gameUndo'), 'mousedown', {x: 0, y: 0});
	    equal(game.graph.edges.length, 0);
	});
	test('Easy Mode checkbox changes both model and actual SVG stroke', () => {
	    game.hint();
	    const checkbox = document.querySelector('#gameEasyMode input');
	    checkbox.checked = false;
	    checkbox.click();
	    equal(game.easyMode, true);
	    equal(game.graph.edges[0].shadow.node.getAttribute('stroke'), 'rgba(0,255,0,0.6)');
	    checkbox.click();
	    equal(game.easyMode, false);
	});
	test('keyboard shortcuts ignore the hidden game', () => {
	    game.hide();
	    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'h', bubbles: true}));
	    equal(game.graph.edges.length, 0);
	});
	test('resize updates real SVG edge coordinates without changing saved geometry', () => {
	    game.hint();
	    const before = JSON.parse(game.graph.saveToJson());
	    game.resize(400, 600);
	    const after = JSON.parse(game.graph.saveToJson());
	    equal(after, before);
	    const edge = game.graph.edges[0];
	    equal(Number(edge.line.node.getAttribute('x1')), edge.start.x);
	    equal(Number(edge.line.node.getAttribute('y2')), edge.end.y);
	});
	test('level picker fetches fixtures, enforces locks, saves and unlocks the next level', async () => {
	    const pickerContainer = document.createElement('div');
	    document.body.appendChild(pickerContainer);
	    const picker = new LevelPicker(pickerContainer, game, LEVEL_URLS.slice(0, 2));
	    const first = pickerContainer.querySelectorAll('.thumbnail')[0];
	    const second = pickerContainer.querySelectorAll('.thumbnail')[1];
	    await waitUntil(() => $._data(first, 'events')?.click && $._data(second, 'events')?.click,
		'level fetch did not attach thumbnail handlers');
	    second.click();
	    equal(game.graph.dots.length, 4, 'locked level must not load');
	    first.click();
	    ok(game.graph.dots.length > 4, 'first published level should load');
	    game.hint(true);
	    game.saveProgress();
	    equal(picker.savedData.levels[LEVEL_URLS[0]].progress.finished, true);
	    equal(picker.savedData.levels[LEVEL_URLS[1]].locked, false);
	    ok(localStorage.getItem(PROGRESS_STORAGE_KEY), 'progress stored in fixture memory');
	    picker.resetProgress();
	    equal(picker.savedData.levels[LEVEL_URLS[1]].locked, true);
	    equal(picker.savedData.levels[LEVEL_URLS[0]].progress.percentDone, 0);
	    picker.showSaveCodeDialog();
	    await waitUntil(() => $('.saveCodeOut').val()?.startsWith('ML'), 'save code dialog did not populate');
	    const decoded = await decodeSaveCode($('.saveCodeOut').val());
	    equal(decoded.levels, picker.savedData.levels);
	    $('.saveCodeDialog').dialog('close');
	    game.setProgressCallback(null);
	    pickerContainer.remove();
	});
	test('touching a game dot supplies the correct graph coordinates', () => {
	    const dot = game.graph.dots[0];
	    touchEvent(dot.circle.node, 'touchstart', screenPoint(game.draw, dot));
	    equal([game.mouseHandler.clickPoint.x, game.mouseHandler.clickPoint.y], [dot.x, dot.y]);
	}); // R2 regression
	test('Hint during an active real SVG drag does not leave a broken edge', () => {
	    game.startDragDot(game.graph.dots[0]);
	    game.hint();
	    ok(game.graph.edges.every(edge => edge.end), 'Hint should finish or cancel the drag');
	}); // R1 regression
	test('handled game shortcuts prevent the browser default action', () => {
	    const event = new KeyboardEvent('keydown', {key: 'z', ctrlKey: true, cancelable: true});
	    document.dispatchEvent(event);
	    equal(event.defaultPrevented, true);
	}); // R14 regression
    }

    if (group === 'editor') {
	const editor = new LevelEditor(container, 500, 500);
	reset = () => {
	    editor.mouseHandler.state = null;
	    editor.loadFromJson(JSON.stringify(TEST_LEVEL));
	    editor.history = [];
	};
	test('JSON load/save preserves title, background, triangle colors and padding', () => {
	    const data = {...TEST_LEVEL, padding: 33};
	    editor.loadFromJson(JSON.stringify(data));
	    const saved = JSON.parse(editor.saveToJson());
	    equal(saved.dots, data.dots);
	    equal(saved.tris, data.tris);
	    equal(saved.extras.title, data.extras.title);
	    equal(saved.extras.backgroundColor, data.extras.backgroundColor);
	    equal(saved.padding, 33);
	});
	test('three dot selections create a triangle; undo removes it', () => {
	    for (const dot of editor.graph.dots.slice(0, 3)) { editor.clickDot(dot); }
	    equal(editor.graph.tris.length, 3);
	    equal(editor.selection.length, 0);
	    editor.undo();
	    equal(editor.graph.tris.length, 2);
	});
	test('interior subdivision creates three triangles and one undo restores the original', () => {
	    const tri = editor.graph.tris[0];
	    editor.clickTri(tri, 150, 150);
	    equal(editor.graph.dots.length, 5);
	    equal(editor.graph.tris.length, 4);
	    editor.undo();
	    equal(editor.graph.dots.length, 4);
	    equal(editor.graph.tris.length, 2);
	});
	test('shared-edge subdivision and grouped undo restore both triangles', () => {
	    editor.click(250, 250);
	    equal(editor.graph.tris.length, 4);
	    editor.undo();
	    equal(editor.graph.dots.length, 4);
	    equal(editor.graph.tris.length, 2);
	});
	test('dragging an editor dot updates triangles and undo restores its position', () => {
	    const dot = editor.graph.dots[0];
	    const start = screenPoint(editor.draw, dot);
	    const end = {x: start.x+30, y: start.y+20};
	    mouseEvent(dot.circle.node, 'mousedown', start);
	    mouseEvent(document, 'mousemove', end);
	    mouseEvent(document, 'mouseup', end);
	    equal([dot.x, dot.y], [80, 70]);
	    editor.undo();
	    equal([dot.x, dot.y], [50, 50]);
	});
	test('Delete Level button and undo restore saved level geometry', () => {
	    document.getElementById('editorDeleteGame').click();
	    equal(editor.graph.dots.length, 0);
	    editor.undo();
	    equal(editor.graph.dots.length, 4);
	    equal(editor.graph.tris.length, 2);
	});
	test('missing background keeps saved triangle colors after both lookup paths fail', async () => {
	    editor.setImage('backgrounds/missing-test-fixture.png', 'missing-test-fixture.png');
	    await waitUntil(() => editor.image.node.getAttribute('href')?.includes('/personal/'),
		'personal background fallback not attempted');
	    await waitUntil(() => !editor.image.node.isConnected, 'failed SVG image not removed');
	    equal(editor.graph.tris[0].color, TEST_LEVEL.tris[0].color);
	    equal(editor.colorLookupCanvas.loaded, false);
	});
	test('one undo restores deleted dot and dependent triangles', () => {
	    editor.removeDot(editor.graph.dots[0]);
	    editor.undo();
	    equal(editor.graph.tris.length, 2);
	}); // R7 regression
	test('graph transforms can be undone with Ctrl-Z', () => {
	    editor.transformGraph(.95);
	    editor.undo();
	    equal([editor.graph.dots[0].x, editor.graph.dots[0].y], [50, 50]);
	}); // R15 regression
	test('transform undo preserves the earlier dot-add undo action', () => {
	    editor.addDot(200, 200);
	    editor.transformGraph(.95);
	    editor.undo();
	    equal([editor.graph.dots[4].x, editor.graph.dots[4].y], [200, 200]);
	    editor.undo();
	    equal(editor.graph.dots.length, 4);
	});
	test('editor keyboard undo leaves a focused title input to its own text undo', () => {
	    editor.addDot(200, 200);
	    document.getElementById('editorTitle').focus();
	    document.getElementById('editorTitle').dispatchEvent(new KeyboardEvent('keydown', {
		key: 'z', ctrlKey: true, bubbles: true, cancelable: true}));
	    equal(editor.graph.dots.length, 5);
	}); // R14 regression
	test('loading a level synchronizes the background color picker', () => {
	    const data = {...TEST_LEVEL, extras: {...TEST_LEVEL.extras,
		backgroundColor: {h: 30, s: 80, l: 40}}};
	    editor.loadFromJson(JSON.stringify(data));
	    equal($('.cpHue').slider('value'), 30);
	}, 'R16');
	test('file import decodes UTF-8 titles without corrupting Unicode', async () => {
	    const data = {...TEST_LEVEL, extras: {...TEST_LEVEL.extras, title: '猫 — dance'}};
	    const transfer = new DataTransfer();
	    transfer.items.add(new File([JSON.stringify(data)], 'unicode.json', {type: 'application/json'}));
	    const input = document.getElementById('editorLoad');
	    input.files = transfer.files;
	    input.dispatchEvent(new Event('change', {bubbles: true}));
	    await waitUntil(() => document.getElementById('editorTitle').value !== TEST_LEVEL.extras.title,
		'file reader did not finish');
	    equal(document.getElementById('editorTitle').value, data.extras.title);
	}, 'R20');
	test('loading a JSON filename uses a single .json suffix on the next save', () => {
	    editor.loadFromJson(JSON.stringify(TEST_LEVEL), 'fixture.json');
	    equal(document.getElementById('editorSaveFileName').value, 'fixture');
	}, 'R21');
	test('malformed editor import preserves the level being edited', () => {
	    try { editor.loadFromJson('{'); } catch (e) {}
	    equal(editor.graph.dots.length, 4);
	    equal(document.getElementById('editorTitle').value, TEST_LEVEL.extras.title);
	}); // R6 regression
	test('removing an image preserves triangle colors and undo can restore the image', async () => {
	    const canvas = document.createElement('canvas');
	    canvas.width = canvas.height = 10;
	    const context = canvas.getContext('2d');
	    context.fillStyle = 'rgb(70,80,90)';
	    context.fillRect(0, 0, 10, 10);
	    editor.setImage(canvas.toDataURL(), 'fixture.png');
	    await waitUntil(() => editor.colorLookupCanvas.loaded, 'editor image did not load');
	    equal(editor.graph.tris[0].color, {red: 70, green: 80, blue: 90});
	    editor.setImage(null, null);
	    equal(editor.image, null);
	    equal(editor.graph.tris[0].color, {red: 70, green: 80, blue: 90});
	    editor.undo();
	    await waitUntil(() => editor.colorLookupCanvas.loaded, 'undo image did not load');
	    equal(editor.imageFilename, 'fixture.png');
	});
    }

    if (group === 'utilities') {
	test('Unicode strings survive a real PNG canvas round trip', async () => {
	    const text = 'Missing Link — 猫 🎉';
	    equal(await PNGToString(stringToPNG(text)), text);
	});
	test('invalid PNG rejects instead of hanging', async () => {
	    let rejected = false;
	    try { await PNGToString('data:image/png;base64,bm90LWEtcG5n'); }
	    catch (e) { rejected = true; }
	    ok(rejected, 'invalid image must reject');
	});
	test('SVG thumbnail conversion returns a decodable PNG with the requested dimensions', async () => {
	    const draw = SVG().addTo(container).size(40, 30);
	    draw.rect(40, 30).fill('red');
	    const data = await svgToPng(draw.node);
	    const img = new Image();
	    img.src = data;
	    await img.decode();
	    equal([img.naturalWidth, img.naturalHeight], [40, 30]);
	    draw.remove();
	});
	test('background sampler averages known pixels and ignores stale image loads', async () => {
	    const canvas = document.createElement('canvas');
	    canvas.width = canvas.height = 20;
	    const context = canvas.getContext('2d');
	    context.fillStyle = 'rgb(10,20,30)';
	    context.fillRect(0, 0, 20, 20);
	    let calls = 0;
	    const lookup = new ColorLookupCanvas(20, 20, () => { calls++; });
	    lookup.setImage(canvas.toDataURL());
	    await waitUntil(() => lookup.loaded, 'sampler image did not load');
	    equal(lookup.getTriColor([{x: 2, y: 2}, {x: 15, y: 2}, {x: 2, y: 15}]),
		{red: 10, green: 20, blue: 30});
	    lookup.setImage(canvas.toDataURL());
	    const pending = lookup.pendingImage;
	    lookup.clearImage();
	    await pending.decode();
	    pending.onload();
	    equal(lookup.loaded, false);
	    equal(calls, 1);
	});
	test('ColorPicker slider changes emit the selected HSL color', () => {
	    const host = $('<div>').appendTo(container);
	    let color;
	    new ColorPicker(host[0], {change: value => { color = value; }});
	    host.find('.cpHue').slider('value', 30);
	    host.find('.cpSat').slider('value', 80);
	    host.find('.cpLight').slider('value', 40);
	    equal(color, {h: 30, s: 80, l: 40});
	    host.remove();
	});
	test('Home Screen tip appears for iOS, dismisses and remembers the choice', () => {
	    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'userAgent');
	    Object.defineProperty(navigator, 'userAgent', {configurable: true, value: 'iPhone'});
	    const picker = Object.create(LevelPicker.prototype);
	    picker.$container = $(container);
	    try {
		picker.addHomeScreenTip();
		equal($('.homeScreenTip').length, 1);
		$('.closeTip').click();
		equal($('.homeScreenTip').length, 0);
		equal(localStorage.getItem(HIDE_HOME_SCREEN_TIP_KEY), '1');
		picker.addHomeScreenTip();
		equal($('.homeScreenTip').length, 0);
	    } finally {
		if (descriptor) { Object.defineProperty(navigator, 'userAgent', descriptor); }
		else { delete navigator.userAgent; }
	    }
	});
	test('PNG string round trip preserves embedded NUL characters', async () => {
	    equal(await PNGToString(stringToPNG('a\0b')), 'a\0b');
	}, 'R17');
	test('standalone ToggleButton can change without a registered callback', () => {
	    const host = $('<div>').appendTo(container);
	    const toggle = new ToggleButton(host, {margin: '0px'});
	    let error;
	    // jQuery trigger lets a synchronous handler exception reach this test.
	    try { toggle.$checkbox.prop('checked', true).trigger('change'); }
	    catch (e) { error = e; }
	    host.remove();
	    if (error) { throw error; }
	}, 'R18');
	test('SVG conversion rejects image load errors instead of leaving export pending', async () => {
	    const NativeImage = window.Image;
	    const draw = SVG().addTo(container).size(20, 20);
	    window.Image = class {
		set src(value) { queueMicrotask(() => this.onerror?.(new Error('test image failure'))); }
	    };
	    try {
		const outcome = await Promise.race([
		    svgToPng(draw.node).then(() => 'resolved', () => 'rejected'),
		    new Promise(resolve => setTimeout(() => resolve('pending'), 100)),
		]);
		equal(outcome, 'rejected');
	    } finally { window.Image = NativeImage; draw.remove(); }
	}, 'R19');
    }

    const asyncErrors = [];
    window.addEventListener('error', event => {
	if (event.error) { asyncErrors.push(String(event.error)); }
    });
    window.addEventListener('unhandledrejection', event => {
	asyncErrors.push(String(event.reason));
    });
    for (const {name, run, issue} of tests) {
	let error = null;
	try { reset(); } catch (e) {
	    report({name: name + ' setup', status: 'FAIL', error: String(e)});
	    continue;
	}
	asyncErrors.length = 0;
	try {
	    await run();
	    await new Promise(resolve => setTimeout(resolve, 0));
	    if (asyncErrors.length) { throw new Error(asyncErrors.join('; ')); }
	} catch (e) { error = e; }
	report({name: (issue ? issue + ': ' : '') + name,
	    status: issue ? (error ? 'XFAIL' : 'XPASS') : (error ? 'FAIL' : 'PASS'),
	    error: error ? String(error) : null});
    }
};
