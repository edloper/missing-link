const {test} = require('node:test');
const assert = require('node:assert/strict');
const {load, drawing, plain} = require('./helpers.cjs');

function fixture() {
    const api = load();
    const game = {width: 600, height: 400, draw: drawing()};
    const mouse = new api.MouseHandler(game);
    return {...api, game, mouse};
}

const event = (x, y, button = 0) => ({clientX: x, clientY: y, button,
    preventDefault() {}, stopPropagation() {}});

test('mouse clicks route to canvas, dot, triangle and edge callbacks', () => {
    const f = fixture();
    const graph = new f.Graph(f.game.draw);
    const a = graph.addDot(10, 10), b = graph.addDot(100, 10), c = graph.addDot(10, 100);
    const tri = graph.addTri([a, b, c], {red: 0, green: 0, blue: 0});
    const edge = graph.addEdge(a, b);
    for (const [obj, method] of [[null, 'click'], [a, 'clickDot'], [tri, 'clickTri'], [edge, 'clickEdge']]) {
	let called = false;
	f.game[method] = () => { called = true; };
	f.mouse.mouseDown(event(10, 10), obj);
	f.mouse.mouseUp(event(10, 10));
	assert.equal(called, true, method);
	assert.equal(f.mouse.state, null);
    }
});

test('small quick movement remains a click; distance or elapsed time starts dragging', () => {
    for (const [distance, elapsed, dragging] of [[5, 199, false], [6, 10, true], [0, 200, true]]) {
	const f = fixture();
	f.mouse.mouseDown(event(0, 0));
	f.setNow(elapsed);
	f.mouse.mouseMove(event(distance, 0));
	assert.equal(f.mouse.state, dragging ? f.mouse.DRAGGING : f.mouse.CLICKING);
    }
});

test('dot drag receives screen coordinates for movement and graph coordinates on release', () => {
    const f = fixture();
    f.game.draw.point = (x, y) => ({x: x/2, y: y/2});
    const dot = new f.Graph(f.game.draw).addDot(0, 0);
    const calls = [];
    for (const method of ['startDragDot', 'dragDot', 'endDragDot']) {
	f.game[method] = (obj, x, y) => calls.push([method, x, y]);
    }
    f.mouse.mouseDown(event(0, 0), dot);
    f.mouse.mouseMove(event(40, 20));
    f.mouse.mouseUp(event(40, 20));
    assert.deepEqual(calls, [['startDragDot', 20, 10], ['dragDot', 40, 20], ['endDragDot', 20, 10]]);
});

test('pan clamps to the zoomed canvas bounds', () => {
    const {mouse} = fixture();
    mouse.zoomLevel = 2;
    mouse.moveViewport(-1000, -1000);
    assert.deepEqual(plain(mouse.viewOffset), {x: 300, y: 200});
    mouse.moveViewport(1000, 1000);
    assert.deepEqual(plain(mouse.viewOffset), {x: 0, y: 0});
});

test('zoom is bounded between one and twenty', () => {
    const {mouse, game} = fixture();
    mouse.zoomViewport({x: 0, y: 0}, 100);
    assert.equal(mouse.zoomLevel, 20);
    mouse.zoomViewport({x: 0, y: 0}, 0.001);
    assert.equal(mouse.zoomLevel, 1);
    assert.deepEqual(game.draw.box, [0, 0, 600, 400]);
});

test('pinch info combines screen distance with graph-space center', () => {
    const {mouse, game} = fixture();
    game.draw.point = (x, y) => ({x: x/2, y: y/2});
    const info = mouse.getPinchInfo([
	{pageX: 0, pageY: 0, clientX: 0, clientY: 0},
	{pageX: 6, pageY: 8, clientX: 6, clientY: 8},
    ]);
    assert.deepEqual(plain(info), {distance: 10, center: {x: 1.5, y: 2}});
});

test('a second touch cancels a drag and begins pinch; invalid touch count cancels pinch', () => {
    const {mouse, game} = fixture();
    const a = {clientX: 10, clientY: 10, pageX: 10, pageY: 10};
    const b = {clientX: 30, clientY: 10, pageX: 30, pageY: 10};
    let cancelled = false;
    game.cancelDrag = () => { cancelled = true; };
    mouse.state = mouse.DRAGGING;
    mouse.touchStart({...event(), touches: [a, b]});
    assert.equal(cancelled, true);
    assert.equal(mouse.state, mouse.PINCHING);
    mouse.pinchMove([a, b, a]);
    assert.equal(mouse.state, null);
});

test('single-touch canvas tap routes through touch coordinates', () => {
    const {mouse, game} = fixture();
    let clicked;
    game.click = (x, y) => { clicked = [x, y]; };
    const touch = {clientX: 10, clientY: 20};
    mouse.touchStart({...event(), touches: [touch]});
    mouse.touchEnd({...event(), changedTouches: [touch]});
    assert.deepEqual(clicked, [10, 20]);
});
