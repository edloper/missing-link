const {test} = require('node:test');
const assert = require('node:assert/strict');
const {load, drawing, level, makeGame, makePicker, plain} = require('./helpers.cjs');

// These assert the DESIRED behavior and currently fail. Node reports them as
// TODOs via test:known. Run `npm run test:bugs` for ordinary failing tests.
// Remove the TODO wrapper when fixing an issue; do not preserve buggy behavior.
function bug(id, name, fn) {
    test(`${id}: ${name}`, {todo: !process.env.MISSING_LINK_STRICT_BUGS}, fn);
}

bug('R2', 'a dot touchstart uses touch coordinates in the game', () => {
    const game = makeGame(load());
    const dot = game.graph.dots[0];
    dot.circle.events.touchstart({touches: [{clientX: 15, clientY: 25}],
	preventDefault() {}, stopPropagation() {}});
    assert.deepEqual(plain(game.mouseHandler.clickPoint), {x: 15, y: 25});
});

bug('R3', 'structurally invalid saved progress cannot break the next startup', async () => {
    const api = load();
    const code = 'ML0-' + btoa(JSON.stringify({levels: {a: {progress: 42}}}));
    // The decoder should reject a code that the loader cannot safely consume.
    await assert.rejects(api.decodeSaveCode(code));
});

bug('R3', 'localStorage with a primitive levels value recovers to defaults', () => {
    const api = load();
    api.storage.set('MissingLink_progress', '{"levels":42}');
    const picker = makePicker(api);
    picker.load();
    assert.equal(picker.savedData.levels.a.locked, false);
});

bug('R3', 'malformed progress edges are skipped without throwing', () => {
    const game = makeGame(load());
    game.loadProgress({edges: [null, [0, 1]]});
    assert.equal(game.graph.edges.length, 1);
});

bug('R4', 'a missing predecessor is treated as unfinished when recomputing locks', () => {
    const api = load();
    api.storage.set('MissingLink_progress', '{"levels":{"b":{"locked":true}}}');
    const picker = makePicker(api);
    picker.load();
    assert.equal(picker.savedData.levels.b.locked, true);
});

bug('R4', 'a finished predecessor unlocks a newly added successor record', () => {
    const api = load();
    api.storage.set('MissingLink_progress', '{"levels":{"a":{"progress":{"finished":true}}}}');
    const picker = makePicker(api);
    picker.load();
    assert.equal(picker.savedData.levels.b.locked, false);
});

bug('R5', 'zoom keeps the cursor anchored on the first zoom from 100 percent', () => {
    const api = load();
    const mouse = new api.MouseHandler({width: 600, height: 400, draw: drawing()});
    mouse.zoomViewport({x: 300, y: 200}, 2);
    assert.deepEqual(plain(mouse.viewOffset), {x: 150, y: 100});
});

bug('R5', 'zooming out from an edge clamps to the NEW viewport bounds', () => {
    const api = load();
    const mouse = new api.MouseHandler({width: 600, height: 400, draw: drawing()});
    mouse.zoomLevel = 2;
    mouse.viewOffset = {x: 300, y: 200};
    mouse.zoomViewport({x: 300, y: 200}, 0.5);
    assert.deepEqual(plain(mouse.viewOffset), {x: 0, y: 0});
});

bug('R6', 'malformed level import preserves the previous graph', () => {
    const game = makeGame(load());
    try { game.loadFromJson('{'); } catch (e) {}
    assert.equal(game.graph.dots.length, level.dots.length);
});

bug('R7', 'one undo restores a deleted editor dot AND its triangles', () => {
    const api = load();
    const game = makeGame(api);
    const editor = Object.create(api.LevelEditor.prototype);
    Object.assign(editor, {graph: game.graph, history: [], selection: [], updateWarnings() {}});
    editor.removeDot(editor.graph.dots[0]);
    editor.undo();
    assert.equal(editor.graph.tris.length, 2);
});

bug('R8', 'out-of-canvas triangle sampling returns finite color components', () => {
    const api = load();
    const lookup = Object.create(api.ColorLookupCanvas.prototype);
    Object.assign(lookup, {loaded: true, canvas: {width: 2, height: 2},
	imageData: {data: new Uint8ClampedArray(16).fill(255)}});
    const color = lookup.getTriColor([{x: 0, y: 0}, {x: 2, y: 0}, {x: 0, y: 2}]);
    assert.ok(Object.values(color).every(Number.isFinite));
});

bug('R9', 'malformed percent escapes in unrelated cookies do not prevent startup', () => {
    const api = load({document: {cookie: 'unrelated=100%'}});
    const picker = makePicker(api);
    picker.load();
    assert.equal(picker.savedData.levels.a.locked, false);
});

bug('R10', 'triangle overlap detection rejects identical triangles', () => {
    const {trianglesOverlap} = load();
    const tri = [{x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10}];
    assert.equal(trianglesOverlap(tri, tri), true);
});

bug('R10', 'triangle overlap detection includes complete containment', () => {
    const {trianglesOverlap} = load();
    assert.equal(trianglesOverlap([{x: 0, y: 0}, {x: 10, y: 0}, {x: 0, y: 10}],
	[{x: 1, y: 1}, {x: 2, y: 1}, {x: 1, y: 2}]), true);
});

bug('R11', 'triangle sampling rejects a degenerate triangle away from the point', () => {
    const {isPointInTriangle} = load();
    assert.equal(isPointInTriangle({x: 100, y: 100},
	[{x: 0, y: 0}, {x: 0, y: 0}, {x: 0, y: 0}]), false);
});

bug('R11', 'circle intersection includes the full radius around segment endpoints', () => {
    const {circleIntersectsLine} = load();
    assert.equal(circleIntersectsLine({x: -6, y: 0}, 7, {x: 0, y: 0}, {x: 10, y: 0}), true);
});

bug('R12', 'Graph.loadFromJson works with its optional callbacks omitted', () => {
    const {Graph} = load();
    const graph = new Graph(drawing());
    graph.loadFromJson(JSON.stringify(level));
    assert.equal(graph.dots.length, 4);
});

bug('R13', 'dot hit target keeps its dotSize scale after a move', () => {
    const {Graph} = load();
    const graph = new Graph(drawing(), {dotSize: 2, clickCircleRadius: 20});
    const dot = graph.addDot(10, 10);
    dot.move(20, 20);
    assert.equal(dot.clickCircle.attr('r'), 40);
});
