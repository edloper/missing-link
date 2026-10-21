const {test} = require('node:test');
const assert = require('node:assert/strict');
const {load, makePicker, plain} = require('./helpers.cjs');

const key = 'MissingLink_progress';
const data = {levels: {a: {progress: {finished: false, percentDone: 50,
    edges: [[0, 1], [1, 2]]}}, '猫': {progress: {finished: true}}}};

for (const compressed of [false, true]) {
    test(`save codes round trip Unicode and progress (compressed=${compressed})`, async () => {
	const api = load(compressed ? {} : {window: {}});
	const code = await api.encodeSaveCode(data);
	assert.ok(code.startsWith(compressed ? 'ML1-' : 'ML0-'));
	const wrapped = '\n ' + code.slice(0, 12) + '\n' + code.slice(12) + ' ';
	assert.deepEqual(plain(await api.decodeSaveCode(wrapped)), data);
    });
}

test('save code decoder rejects invalid prefix, base64, compression, JSON and missing levels', async () => {
    const api = load();
    for (const code of ['bad', 'ML0-!', 'ML1-' + btoa('not deflate'),
	'ML0-' + btoa('{'), 'ML0-' + btoa('{}'), 'ML0-' + btoa('{"levels":null}')]) {
	await assert.rejects(api.decodeSaveCode(code));
    }
});

test('compressed saves explain when decompression is unavailable', async () => {
    const compressed = await load().encodeSaveCode(data);
    await assert.rejects(load({window: {}}).decodeSaveCode(compressed), /too old/);
});

test('fresh progress defaults to one unlocked level and zero completed triangles', () => {
    const api = load();
    const picker = makePicker(api);
    picker.load();
    assert.deepEqual(plain(picker.savedData), {levels: {
	a: {progress: {finished: false, percentDone: 0, edges: []}, locked: false, index: 0},
	b: {progress: {finished: false, percentDone: 0, edges: []}, locked: true, index: 1},
	c: {progress: {finished: false, percentDone: 0, edges: []}, locked: true, index: 2},
    }});
});

test('stored completed levels unlock successors while retaining partial progress', () => {
    const api = load();
    api.storage.set(key, JSON.stringify({levels: {
	a: {progress: {finished: true}}, b: {progress: {edges: [[0, 1]], percentDone: 10}},
    }}));
    const picker = makePicker(api);
    picker.load();
    assert.equal(picker.savedData.levels.b.locked, false);
    assert.equal(picker.savedData.levels.c.locked, true);
    assert.deepEqual(plain(picker.savedData.levels.b.progress.edges), [[0, 1]]);
    assert.equal(picker.save(), true);
    assert.deepEqual(JSON.parse(api.storage.get(key)), plain(picker.savedData));
});

test('malformed stored JSON falls back to cookie migration', () => {
    const api = load();
    api.storage.set(key, '{broken');
    const picker = makePicker(api);
    let migrated = false;
    picker.loadLevelsFromCookies = () => { migrated = true; return {}; };
    picker.load();
    assert.equal(migrated, true);
    assert.equal(picker.savedData.levels.a.locked, false);
});

test('legacy cookie migration deletes cookies only after durable save succeeds', () => {
    for (const canSave of [true, false]) {
	const api = load({document: {cookie: 'MissingLink_a=' + encodeURIComponent(
	    JSON.stringify({progress: {finished: true}})) + '; MissingLink_b=%7B%7D'}});
	const picker = makePicker(api);
	let deleted = false;
	picker.deleteOldCookies = () => { deleted = true; };
	if (!canSave) { picker.save = () => false; }
	picker.load();
	assert.equal(deleted, canSave);
	assert.equal(picker.savedData.levels.b.locked, false);
    }
});

test('localStorage wins over legacy cookies and cookies are retained on that path', () => {
    const api = load();
    api.storage.set(key, JSON.stringify({levels: {a: {progress: {percentDone: 25}}}}));
    const picker = makePicker(api);
    picker.loadLevelsFromCookies = () => { throw new Error('should not migrate'); };
    picker.deleteOldCookies = () => { throw new Error('should not delete'); };
    picker.load();
    assert.equal(picker.savedData.levels.a.progress.percentDone, 25);
});

test('cookie parser handles spaces, exact names, missing and malformed values', () => {
    const picker = makePicker(load());
    assert.deepEqual(plain(picker.loadCookie('x={}; MissingLink_a={"v":1}', 'MissingLink_a')), {v: 1});
    assert.equal(picker.loadCookie('MissingLink_ab={}', 'MissingLink_a'), null);
    assert.equal(picker.loadCookie('MissingLink_a={', 'MissingLink_a'), null);
});

test('storage failures do not throw during load or save', () => {
    const api = load({localStorage: {
	getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); },
    }});
    const picker = makePicker(api);
    picker.load();
    assert.equal(picker.savedData.levels.a.locked, false);
    assert.equal(picker.save(), false);
});

test('persistence is requested once and only when not already granted', async () => {
    for (const granted of [true, false]) {
	let calls = 0;
	const api = load({navigator: {storage: {
	    persisted: async () => granted, persist: async () => { calls++; return true; },
	}}});
	const picker = makePicker(api);
	picker.requestPersistentStorage();
	picker.requestPersistentStorage();
	await new Promise(resolve => setImmediate(resolve));
	assert.equal(calls, granted ? 0 : 1);
    }
});

test('persistence denial and unavailable API are tolerated', async () => {
    makePicker(load()).requestPersistentStorage();
    const api = load({navigator: {storage: {
	persist() {}, persisted: async () => { throw new Error('denied'); },
    }}});
    makePicker(api).requestPersistentStorage();
    await new Promise(resolve => setImmediate(resolve));
});
