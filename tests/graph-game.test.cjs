const {test} = require('node:test');
const assert = require('node:assert/strict');
const {load, drawing, level, makeGame, plain} = require('./helpers.cjs');

test('level transform centers a square in portrait and landscape canvases', () => {
    const {Graph} = load();
    assert.deepEqual(plain(new Graph(drawing()).levelTransform()),
		     {scale: 360, dx: 120, dy: 20});
    assert.deepEqual(plain(new Graph(drawing(400, 600)).levelTransform()),
		     {scale: 360, dx: 20, dy: 120});
    assert.deepEqual(plain(new Graph(drawing(), {padding: 0}).levelTransform(50)),
		     {scale: 400, dx: 100, dy: 0});
});

for (const padding of [undefined, 0, 37]) {
    test(`graph round trip preserves coordinates, colors, extras and padding=${padding}`, () => {
	const {Graph} = load();
	const graph = new Graph(drawing());
	const data = {...level};
	if (padding !== undefined) { data.padding = padding; }
	for (let i = 0; i < 4; i++) {
	    const extras = graph.loadFromJson(JSON.stringify(data),
		(x, y) => graph.addDot(x, y), (dots, color) => graph.addTri(dots, color));
	    assert.deepEqual(JSON.parse(graph.saveToJson(extras)), data);
	    assert.ok(graph.dots.every(dot => !Object.hasOwn(dot, '_index')));
	}
    });
}

test('removing a dot removes dependent triangles and edges from all neighbors', () => {
    const game = makeGame(load());
    const [a, b, c] = game.graph.dots;
    const edge = game.addEdge(a, b);
    const tri = game.graph.tris[0];
    game.graph.removeDot(a);
    assert.equal(game.graph.dots.length, 3);
    assert.equal(game.graph.tris.length, 1);
    assert.equal(game.graph.edges.length, 0);
    assert.ok(!b.tris.includes(tri) && !c.tris.includes(tri));
    assert.equal(b.edges.length, 0);
    assert.equal(edge.line.removed, true);
    assert.equal(tri.polygon, null);
});

test('clear removes the whole graph and resets padding', () => {
    const game = makeGame(load(), {...level, padding: 25});
    game.addEdge(...game.graph.dots.slice(0, 2));
    game.graph.clear();
    assert.deepEqual([game.graph.dots.length, game.graph.edges.length,
		      game.graph.tris.length], [0, 0, 0]);
    assert.equal(game.graph.levelPadding, undefined);
});

test('nearest-dot lookup handles an empty graph and ties consistently', () => {
    const {Graph} = load();
    const graph = new Graph(drawing());
    assert.equal(graph.closestDotTo(0, 0), null);
    const first = graph.addDot(0, 0);
    graph.addDot(10, 0);
    assert.equal(graph.closestDotTo(5, 0), first);
    assert.equal(graph.closestDotTo(9, 0), graph.dots[1]);
});

test('game initializes unique neighbor counts and hidden triangles', () => {
    const game = makeGame(load());
    assert.deepEqual(plain(game.graph.dots.map(dot => dot.maxEdges)), [2, 3, 3, 2]);
    assert.ok(game.graph.tris.every(tri => tri.hidden));
    assert.ok(game.graph.dots.every(dot => dot.textString === String(dot.maxEdges)));
});

test('a triangle appears only after its third edge and hides when an edge is removed', () => {
    const game = makeGame(load());
    const [a, b, c] = game.graph.dots;
    const ab = game.addEdge(a, b);
    game.addEdge(b, c);
    assert.equal(game.graph.tris[0].hidden, true);
    game.addEdge(c, a);
    assert.equal(game.graph.tris[0].hidden, false);
    assert.equal(a.circle.visible, false);
    game.removeEdge(ab);
    assert.equal(game.graph.tris[0].hidden, true);
    assert.equal(a.circle.visible, true);
});

test('shared-edge removal hides both completed triangles', () => {
    const game = makeGame(load());
    game.hint(true);
    assert.equal(game.graph.edges.length, 5);
    assert.equal(game.completions, 1);
    game.removeEdge(game.graph.edges.find(edge =>
	new Set([edge.start.index, edge.end.index, 1, 2]).size === 2));
    assert.ok(game.graph.tris.every(tri => tri.hidden));
});

test('partial progress records connected edges and triangle percentage', () => {
    const game = makeGame(load());
    let progress;
    game.setProgressCallback(value => { progress = value; });
    const [a, b, c, d] = game.graph.dots;
    game.addEdge(a, b);
    game.addEdge(b, c);
    game.addEdge(c, a);
    game.startDragDot(d);
    game.saveProgress();
    assert.deepEqual(plain(progress), {
	finished: false, percentDone: 50, edges: [[0, 1], [1, 2], [2, 0]],
    });
});

test('finished progress is compact and can reconstruct a complete level', () => {
    const game = makeGame(load());
    let progress;
    game.setProgressCallback(value => { progress = value; });
    game.hint(true);
    game.saveProgress();
    assert.deepEqual(plain(progress), {percentDone: 100, finished: true, edges: []});
    const restored = makeGame(load());
    restored.loadProgress(progress);
    assert.equal(restored.graph.edges.length, 5);
    assert.ok(restored.graph.tris.every(tri => !tri.hidden));
});

test('loading partial progress skips stale, duplicate, reversed and self edges', () => {
    const game = makeGame(load());
    let saves = 0;
    game.setProgressCallback(() => { saves++; });
    game.loadProgress({edges: [[0, 1], [1, 0], [0, 0], [10, 2], [-1, 1], [1, 2]]});
    assert.equal(game.graph.edges.length, 2);
    assert.equal(saves, 0);
});

test('hint removes incorrect edges before adding one missing correct edge', () => {
    const game = makeGame(load());
    const [a, , , d] = game.graph.dots;
    const wrong = game.addEdge(a, d);
    assert.equal(game.isCorrectEdge(wrong), false);
    game.hint();
    assert.equal(game.graph.edges.length, 0);
    game.hint();
    assert.equal(game.graph.edges.length, 1);
    assert.ok(game.isCorrectEdge(game.graph.edges[0]));
});

test('undo reverses additions and removals and handles empty history', () => {
    const game = makeGame(load());
    game.undo();
    game.hint();
    game.undo();
    assert.equal(game.graph.edges.length, 0);
    game.hint();
    game.clickEdge(game.graph.edges[0]);
    game.undo();
    assert.equal(game.graph.edges.length, 1);
    game.undo();
    assert.equal(game.graph.edges.length, 0);
});

test('Easy Mode changes correct/incorrect shadows and can be turned off', () => {
    const game = makeGame(load());
    const [a, b, , d] = game.graph.dots;
    const correct = game.addEdge(a, b);
    const wrong = game.addEdge(a, d);
    game.setEasyMode(true);
    assert.equal(correct.shadow.strokeValue.color, 'rgba(0,255,0,0.6)');
    assert.equal(wrong.shadow.strokeValue.color, 'rgba(255,0,0,0.6)');
    game.setEasyMode(false);
    assert.equal(wrong.shadow.strokeValue.color, 'rgba(0,0,0,0)');
});

test('drag connection rejects self, duplicate, distant, full and crossing endpoints', () => {
    const game = makeGame(load());
    const [a, b, c, d] = game.graph.dots;
    game.startDragDot(a);
    const ok = (dot, x = dot?.x, y = dot?.y) => game.okToConnectActiveEdgeTo(dot, x, y);
    assert.equal(ok(null), false);
    assert.equal(ok(a), false);
    assert.equal(ok(b, b.x + 41, b.y), false);
    assert.equal(ok(b), true);
    game.addEdge(a, b);
    assert.equal(ok(b), false);
    game.cancelDrag();
    game.startDragDot(d);
    game.addEdge(b, c);
    assert.equal(ok(a), false);
    game.addEdge(b, d);
    assert.equal(ok(b), false);
});

test('successful drag records one connected edge; cancellation leaves no temporary edges', () => {
    const game = makeGame(load());
    const [a, b] = game.graph.dots;
    game.startDragDot(a);
    game.endDragDot(a, b.x, b.y);
    assert.equal(game.graph.edges.length, 1);
    assert.equal(game.activeEdge, null);
    assert.equal(game.history.length, 1);
    game.startDragDot(a);
    game.cancelDrag();
    assert.equal(game.graph.edges.length, 1);
    game.undo();
    assert.equal(game.graph.edges.length, 0);
});

test('resize preserves normalized geometry, edges, progress and resets viewport', () => {
    const game = makeGame(load(), {...level, padding: 30});
    game.hint();
    const before = JSON.parse(game.graph.saveToJson(level.extras));
    game.startDragDot(game.graph.dots[3]);
    game.resize(400, 700);
    assert.deepEqual(JSON.parse(game.graph.saveToJson(level.extras)), before);
    assert.equal(game.graph.edges.length, 1);
    assert.equal(game.activeEdge, null);
    const edge = game.graph.edges[0];
    assert.deepEqual(edge.line.points, [edge.start.x, edge.start.y, edge.end.x, edge.end.y]);
    assert.equal(game.mouseHandler.zoomLevel, 1);
    assert.deepEqual(plain(game.mouseHandler.viewOffset), {x: 0, y: 0});
});

test('invalid level shape, references and metadata leave existing state intact', () => {
    const game = makeGame(load());
    game.hint();
    const before = game.graph.saveToJson(level.extras);
    for (const data of [null, {}, {...level, dots: [null]},
	{...level, tris: [{corners: [0, 1, 99]}]},
	{...level, tris: [{corners: [0, 1, 2], color: 'red'}]},
	{...level, extras: {backgroundColor: null}}, {...level, extras: {imageZoom: 'bad'}}]) {
	assert.throws(() => game.loadFromJson(JSON.stringify(data)));
	assert.equal(game.graph.saveToJson(level.extras), before);
	assert.equal(game.graph.edges.length, 1);
	assert.equal(game.history.length, 1);
    }
});
