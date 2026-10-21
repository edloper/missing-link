const {test} = require('node:test');
const assert = require('node:assert/strict');
const {load, plain} = require('./helpers.cjs');

const p = (x, y) => ({x, y});
const triangle = [p(0, 0), p(10, 0), p(0, 10)];

test('point inclusion accepts either winding, corners and boundary', () => {
    const {isPointInTriangle: inside} = load();
    for (const corners of [triangle, [...triangle].reverse()]) {
	for (const point of [p(1, 1), p(0, 0), p(5, 5)]) {
	    assert.equal(inside(point, corners), true);
	}
	assert.equal(inside(p(8, 8), corners), false);
    }
});

test('line intersections distinguish crossings, shared ends and identical edges', () => {
    const {linesIntersect: intersect} = load();
    assert.equal(intersect(p(0, 0), p(10, 10), p(0, 10), p(10, 0)), true);
    assert.equal(intersect(p(0, 0), p(10, 0), p(10, 0), p(10, 10)), false);
    assert.equal(intersect(p(0, 0), p(10, 0), p(10, 0), p(0, 0)), false);
    assert.equal(intersect(p(0, 0), p(10, 0), p(0, 1), p(10, 1)), false);
});

test('triangle edge crossings are detected; adjacent triangles are allowed', () => {
    const {trianglesOverlap: overlap} = load();
    assert.equal(overlap(triangle, [p(5, -2), p(5, 8), p(12, 5)]), true);
    assert.equal(overlap(triangle, [p(10, 0), p(0, 10), p(10, 10)]), false);
    assert.equal(overlap(triangle, [p(10, 0), p(20, 0), p(20, 10)]), false);
    assert.equal(overlap(triangle, [p(20, 0), p(30, 0), p(20, 10)]), false);
    assert.equal(overlap(triangle, [...triangle].reverse()), true);
});

test('sampling visits only triangle points and covers corners and interior', () => {
    const {iterateTrianglePoints: iterate, isPointInTriangle: inside} = load();
    const samples = [];
    iterate(triangle, (x, y) => samples.push(p(x, y)));
    assert.equal(samples.length, 66);
    assert.ok(samples.every(point => inside(point, triangle)));
    assert.ok(samples.some(point => point.x === 0 && point.y === 0));
    assert.ok(samples.some(point => point.x === 3 && point.y === 3));
});

test('circle/line test accepts a nearby segment and rejects distant ones', () => {
    const {circleIntersectsLine: intersects} = load();
    assert.equal(intersects(p(5, 1), 2, p(0, 0), p(10, 0)), true);
    assert.equal(intersects(p(5, 3), 2, p(0, 0), p(10, 0)), false);
    assert.equal(intersects(p(20, 0), 2, p(0, 0), p(10, 0)), false);
});

test('HSV conversions cover primary colors, wraparound, grayscale and black', () => {
    const {hsvToRgb} = load();
    for (const [input, expected] of [
	[[0, 1, 1], [255, 0, 0]], [[1/3, 1, 1], [0, 255, 0]],
	[[2/3, 1, 1], [0, 0, 255]], [[1, 1, 1], [255, 0, 0]],
	[[0.5, 0, 0.5], [128, 128, 128]], [[0.5, 1, 0], [0, 0, 0]],
    ]) {
	assert.deepEqual(plain(hsvToRgb(...input)), expected);
    }
});
