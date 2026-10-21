const {test} = require('node:test');
const assert = require('node:assert/strict');
const {load, drawing, level, makeGame, makePicker, plain} = require('./helpers.cjs');

// These assert the DESIRED behavior and currently fail. Node reports them as
// TODOs via test:known. Run `npm run test:bugs` for ordinary failing tests.
// Remove the TODO wrapper when fixing an issue; do not preserve buggy behavior.
function bug(id, name, fn) {
    test(`${id}: ${name}`, {todo: !process.env.MISSING_LINK_STRICT_BUGS}, fn);
}

