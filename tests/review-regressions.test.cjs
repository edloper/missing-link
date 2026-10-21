const {test} = require('node:test');
const assert = require('node:assert/strict');
const {load, drawing, level, makeGame, makePicker, plain} = require('./helpers.cjs');

test('R1: Hint while drawing an unfinished edge does not throw', () => {
    const game = makeGame(load());
    game.startDragDot(game.graph.dots[0]);
    game.hint();
    assert.ok(game.graph.edges.every(edge => edge.start));
});

test('R1: Undo while drawing from a dot with history does not throw', () => {
    const game = makeGame(load());
    game.hint();
    game.startDragDot(game.graph.dots[0]);
    game.undo();
    assert.equal(game.history.length, 0);
});

test('R2: a dot touchstart uses touch coordinates in the game', () => {
    const game = makeGame(load());
    const dot = game.graph.dots[0];
    dot.circle.events.touchstart({touches: [{clientX: 15, clientY: 25}],
	preventDefault() {}, stopPropagation() {}});
    assert.deepEqual(plain(game.mouseHandler.clickPoint), {x: 15, y: 25});
});

test('R3: structurally invalid saved progress cannot break the next startup', async () => {
    const api = load();
    const code = 'ML0-' + btoa(JSON.stringify({levels: {a: {progress: 42}}}));
    // The decoder should reject a code that the loader cannot safely consume.
    await assert.rejects(api.decodeSaveCode(code));
});

test('R3: localStorage with a primitive levels value recovers to defaults', () => {
    const api = load();
    api.storage.set('MissingLink_progress', '{"levels":42}');
    const picker = makePicker(api);
    picker.load();
    assert.equal(picker.savedData.levels.a.locked, false);
});

test('R3: malformed progress edges are skipped without throwing', () => {
    const game = makeGame(load());
    game.loadProgress({edges: [null, [0, 1]]});
    assert.equal(game.graph.edges.length, 1);
});

test('R4: a missing predecessor is treated as unfinished when recomputing locks', () => {
    const api = load();
    api.storage.set('MissingLink_progress', '{"levels":{"b":{"locked":true}}}');
    const picker = makePicker(api);
    picker.load();
    assert.equal(picker.savedData.levels.b.locked, true);
});

test('R4: a finished predecessor unlocks a newly added successor record', () => {
    const api = load();
    api.storage.set('MissingLink_progress', '{"levels":{"a":{"progress":{"finished":true}}}}');
    const picker = makePicker(api);
    picker.load();
    assert.equal(picker.savedData.levels.b.locked, false);
});

test('R5: zoom keeps the cursor anchored on the first zoom from 100 percent', () => {
    const api = load();
    const mouse = new api.MouseHandler({width: 600, height: 400, draw: drawing()});
    mouse.zoomViewport({x: 300, y: 200}, 2);
    assert.deepEqual(plain(mouse.viewOffset), {x: 150, y: 100});
});

test('R5: zooming out from an edge clamps to the NEW viewport bounds', () => {
    const api = load();
    const mouse = new api.MouseHandler({width: 600, height: 400, draw: drawing()});
    mouse.zoomLevel = 2;
    mouse.viewOffset = {x: 300, y: 200};
    mouse.zoomViewport({x: 300, y: 200}, 0.5);
    assert.deepEqual(plain(mouse.viewOffset), {x: 0, y: 0});
});

test('R6: malformed level import preserves the previous graph', () => {
    const game = makeGame(load());
    try { game.loadFromJson('{'); } catch (e) {}
    assert.equal(game.graph.dots.length, level.dots.length);
});

test('R7: one undo restores a deleted editor dot AND its triangles', () => {
    const api = load();
    const game = makeGame(api);
    const editor = Object.create(api.LevelEditor.prototype);
    Object.assign(editor, {graph: game.graph, history: [], selection: [],
	colorLookupCanvas: {loaded: false}, updateWarnings() {}});
    editor.removeDot(editor.graph.dots[0]);
    editor.undo();
    assert.equal(editor.graph.tris.length, 2);
});

