/* Test-only parent: each group gets a separate global scope and controls. */
window.testResults = {done: false, passed: 0, failed: 0, expectedFailures: 0,
    unexpectedPasses: 0, results: []};

function report(result) {
    const output = window.testResults;
    output.results.push(result);
    const counters = {PASS: 'passed', FAIL: 'failed', XFAIL: 'expectedFailures',
	XPASS: 'unexpectedPasses'};
    output[counters[result.status]]++;
    const item = document.createElement('li');
    item.className = result.status.toLowerCase();
    item.textContent = `${result.status}: ${result.name}${result.error ? ' — ' + result.error : ''}`;
    document.getElementById('results').appendChild(item);
}

(async () => {
    for (const group of ['game', 'editor', 'utilities']) {
	const frame = document.createElement('iframe');
	frame.title = group + ' test fixture';
	frame.src = 'browser-fixture.html?group=' + group;
	try {
	    await new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error('fixture load timed out')), 20000);
		frame.onload = () => { clearTimeout(timer); resolve(); };
		document.body.appendChild(frame);
	    });
	    await Promise.race([
		(async () => {
		    await frame.contentWindow.testsReady;
		    await frame.contentWindow.runTests(group, report);
		})(),
		new Promise((resolve, reject) => {
		    frame.deadline = setTimeout(() => reject(new Error('group timed out')), 45000);
		}),
	    ]);
	} catch (error) {
	    report({name: group + ' fixture', status: 'FAIL', error: String(error)});
	} finally {
	    clearTimeout(frame.deadline);
	    frame.remove();
	}
    }
    const result = window.testResults;
    result.done = true;
    document.getElementById('summary').textContent =
	`${result.passed} passed; ${result.failed} failed; ` +
	`${result.expectedFailures} expected failures; ${result.unexpectedPasses} unexpected passes.`;
    document.title = result.failed || result.unexpectedPasses ?
	'FAIL — Missing Link tests' : 'PASS — Missing Link tests';
})();
