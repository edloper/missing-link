const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {root, load, makeGame, plain} = require('./helpers.cjs');

test('published level URLs are unique and point to existing version-2 levels', () => {
    const {LEVEL_URLS: urls} = load();
    assert.ok(urls.length > 0);
    assert.equal(new Set(urls).size, urls.length);
    for (const url of urls) {
	assert.equal(JSON.parse(fs.readFileSync(path.join(root, url))).version, 2, url);
    }
});

for (const file of fs.readdirSync(path.join(root, 'levels')).filter(name => name.endsWith('.json'))) {
    test(`${file}: valid graph, lossless round trip and solvable by hints`, () => {
	const api = load();
	const data = JSON.parse(fs.readFileSync(path.join(root, 'levels', file)));
	assert.ok(data.dots.length > 0 && data.tris.length > 0);
	for (const dot of data.dots) {
	    assert.ok(Number.isFinite(dot.x) && Number.isFinite(dot.y));
	}
	const expectedEdges = new Set();
	for (const tri of data.tris) {
	    assert.equal(tri.corners.length, 3);
	    assert.equal(new Set(tri.corners).size, 3);
	    for (const i of tri.corners) {
		assert.ok(Number.isInteger(i) && i >= 0 && i < data.dots.length);
	    }
	    for (const component of ['red', 'green', 'blue']) {
		assert.ok(Number.isFinite(tri.color[component]) && tri.color[component] >= 0 && tri.color[component] <= 255);
	    }
	    for (let i = 0; i < 3; i++) {
		expectedEdges.add([tri.corners[i], tri.corners[(i+1)%3]].sort((a, b) => a-b).join(','));
	    }
	}
	const game = makeGame(api, data);
	const saved = JSON.parse(game.graph.saveToJson(data.extras));
	assert.deepEqual(saved.tris, data.tris);
	assert.deepEqual(saved.extras, data.extras);
	for (let i = 0; i < data.dots.length; i++) {
	    assert.ok(Math.abs(saved.dots[i].x - data.dots[i].x) < 1e-12);
	    assert.ok(Math.abs(saved.dots[i].y - data.dots[i].y) < 1e-12);
	}
	game.hint(true);
	assert.equal(game.graph.edges.length, expectedEdges.size);
	assert.ok(game.graph.tris.every(tri => !tri.hidden));
	let progress;
	game.setProgressCallback(value => { progress = value; });
	game.saveProgress();
	assert.deepEqual(plain(progress), {percentDone: 100, finished: true, edges: []});
    });
}
