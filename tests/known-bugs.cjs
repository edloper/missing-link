const {test} = require('node:test');
const assert = require('node:assert/strict');
const {load, drawing, level, makeGame, makePicker, plain} = require('./helpers.cjs');

// These assert the DESIRED behavior and currently fail. Node reports them as
// TODOs via test:known. Run `npm run test:bugs` for ordinary failing tests.
// Remove the TODO wrapper when fixing an issue; do not preserve buggy behavior.
function bug(id, name, fn) {
    test(`${id}: ${name}`, {todo: !process.env.MISSING_LINK_STRICT_BUGS}, fn);
}

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
