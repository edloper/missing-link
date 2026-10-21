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

