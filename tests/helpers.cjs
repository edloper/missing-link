const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

// Load the unmodified script-tag sources in a fresh global scope per test.
// Only drawing, time and browser I/O are faked; model/game logic is real.
function load(overrides = {}) {
    let now = 0;
    let nextTimer = 1;
    const timers = new Map();
    const storage = new Map();
    const context = vm.createContext({
	console: {log() {}, error() {}, assert(value, message) {
	    if (!value) { throw new Error(message); }
	}},
	TextEncoder, TextDecoder, Blob, Response, CompressionStream,
	DecompressionStream, Uint8Array, atob, btoa,
	performance: {now: () => now},
	setTimeout: (fn, delay) => {
	    const id = nextTimer++;
	    timers.set(id, {fn, delay});
	    return id;
	},
	clearTimeout: id => timers.delete(id),
	setInterval: () => nextTimer++, clearInterval() {},
	document: {cookie: '', addEventListener() {}}, navigator: {},
	localStorage: {
	    getItem: key => storage.get(key) ?? null,
	    setItem: (key, value) => storage.set(key, value),
	},
	window: {CompressionStream, DecompressionStream},
	...overrides,
    });
    const files = ['shapes', 'color', 'graph', 'mouse_handler', 'game',
		   'level_picker', 'editor', 'level_urls'];
    for (const file of files) {
	vm.runInContext(fs.readFileSync(path.join(root, 'javascript', file + '.js'),
				       'utf8'), context, {filename: file + '.js'});
    }
    const api = vm.runInContext('({Graph, Dot, Edge, Tri, Game, GameHistoryEvent, ' +
	'MouseHandler, LevelPicker, LevelEditor, ColorLookupCanvas, ' +
	'linesIntersect, trianglesOverlap, isPointInTriangle, circleIntersectsLine, ' +
	'iterateTrianglePoints, hsvToRgb, encodeSaveCode, decodeSaveCode, LEVEL_URLS})', context);
    return {...api, context, storage, timers, setNow: value => { now = value; }};
}

class Shape {
    constructor() {
	this.node = {style: ''};
	this.attrs = {};
	this.events = {};
	this.visible = true;
    }
    attr(key, value) {
	if (value === undefined) { return this.attrs[key]; }
	this.attrs[key] = value;
	return this;
    }
    stroke(value) { this.strokeValue = {...this.strokeValue, ...value}; return this; }
    fill(value) { this.fillValue = value; return this; }
    radius(value) { return this.attr('r', value); }
    plot(...value) { this.points = value; return this; }
    move(x, y) { this.position = {x, y}; return this; }
    amove(x, y) { return this.move(x, y); }
    plain(value) { this.text = value; return this; }
    font() { return this; }
    insertBefore() { return this; }
    hide() { this.visible = false; return this; }
    show() { this.visible = true; return this; }
    remove() { this.removed = true; return this; }
    on(name, callback) { this.events[name] = callback; return this; }
}

function drawing(width = 600, height = 400) {
    return {
	width: () => width, height: () => height,
	size(w, h) { width = w; height = h; return this; },
	rect: () => new Shape(), circle: () => new Shape(),
	plain: () => new Shape(), polygon: () => new Shape(), line: () => new Shape(),
	on() {}, css() {}, point: (x, y) => ({x, y}),
	viewbox(...args) { this.box = args; },
    };
}

const level = {
    version: 2,
    dots: [{x: 0, y: 0}, {x: 1, y: 0}, {x: 0, y: 1}, {x: 1, y: 1}],
    tris: [
	{corners: [0, 1, 2], color: {red: 10, green: 20, blue: 30}},
	{corners: [1, 2, 3], color: {red: 40, green: 50, blue: 60}},
    ],
    extras: {title: 'Two triangles', backgroundColor: {h: 180, s: 50, l: 90}},
};

function makeGame(api, data = level) {
    const game = Object.create(api.Game.prototype);
    game.draw = drawing();
    game.graph = new api.Graph(game.draw);
    game.graph.setAlpha(1);
    game.width = 600;
    game.height = 400;
    game.$backButton = {removeClass() {}, addClass() {}};
    game.$title = {text() {}};
    game.$container = {find: () => ({css() {}})};
    game.mouseHandler = new api.MouseHandler(game);
    game.completions = 0;
    game.levelComplete = () => { game.completions++; };
    game.loadFromJson(JSON.stringify(data));
    return game;
}

function makePicker(api, urls = ['a', 'b', 'c']) {
    const picker = Object.create(api.LevelPicker.prototype);
    picker.levelUrls = urls;
    return picker;
}

const plain = value => JSON.parse(JSON.stringify(value));
module.exports = {root, load, drawing, level, makeGame, makePicker, plain};
