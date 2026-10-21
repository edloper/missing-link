const {test} = require('node:test');
const assert = require('node:assert/strict');
const {load, drawing, level, makeGame, makePicker, plain} = require('./helpers.cjs');

// These assert the DESIRED behavior and currently fail. Node reports them as
// TODOs via test:known. Run `npm run test:bugs` for ordinary failing tests.
// Remove the TODO wrapper when fixing an issue; do not preserve buggy behavior.
function bug(id, name, fn) {
    test(`${id}: ${name}`, {todo: !process.env.MISSING_LINK_STRICT_BUGS}, fn);
}

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
