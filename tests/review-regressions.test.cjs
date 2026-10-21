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

