const {spawnSync} = require('node:child_process');
const path = require('node:path');
const result = spawnSync(process.execPath, ['--test',
    path.join(__dirname, 'known-bugs.cjs')], {
    stdio: 'inherit', env: {...process.env, MISSING_LINK_STRICT_BUGS: '1'},
});
if (result.error) { throw result.error; }
process.exitCode = result.status ?? 1;
