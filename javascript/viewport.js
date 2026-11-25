// Undo a stuck page offset that iOS leaves after a rotation.
//
// On an iPhone, in a web app added to the Home Screen, turning the phone to
// landscape and back to portrait can leave the whole page shifted up by the
// status bar's height (59px on a Dynamic Island iPhone): the body's box sits
// at top -59 and `visualViewport.offsetTop` is 59, while `scrollY` may still
// say 0.  The page still paints in the right place, but taps are hit-tested
// against the shifted page and land about 59px low, so buttons stop
// answering.  It lasts until something scrolls the page back.
//
// Only use this on a page that never scrolls on purpose (game_fullscreen.html
// has `body {overflow: hidden}`), where any offset after a resize is this
// bug: it scrolls the page back to 0,0.  iOS settles a rotation in steps, so
// check again a little later.  Seen and fixed the same way elsewhere:
// github.com/victronenergy/gui-v2/pull/3280.

// If the visual viewport is this much shorter than the window, an on-screen
// keyboard is up: leave the page alone.
const KEYBOARD_HEIGHT = 150;

// Is the page shifted or scrolled away from 0,0?
function pageIsOffset() {
    const vv = window.visualViewport;
    const body = document.body.getBoundingClientRect();
    const root = document.documentElement.getBoundingClientRect();
    return (window.scrollX !== 0 || window.scrollY !== 0 ||
	    body.top < -1 || body.left < -1 ||
	    root.top < -1 || root.left < -1 ||
	    // A pinch zoom also moves the visual viewport; leave one alone.
	    (vv && Math.abs(vv.scale - 1) < 0.01 &&
	     (Math.abs(vv.offsetTop) > 1 || Math.abs(vv.offsetLeft) > 1)));
}

function isEditingText() {
    const active = document.activeElement;
    if (!active) return false;
    if (active.tagName === 'TEXTAREA' || active.isContentEditable) return true;
    return (active.tagName === 'INPUT' &&
	    !/^(checkbox|radio|range|button|submit|reset)$/.test(active.type));
}

function putPageBack() {
    const vv = window.visualViewport;
    if (vv && window.innerHeight - vv.height > KEYBOARD_HEIGHT) return;
    if (isEditingText()) return;
    if (!pageIsOffset()) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
}

// Watch for rotations and resizes for the life of the page.
function keepPageInPlace() {
    const timers = [];
    function schedule() {
	while (timers.length) clearTimeout(timers.pop());
	putPageBack();
	requestAnimationFrame(putPageBack);
	for (const ms of [150, 400, 800]) timers.push(setTimeout(putPageBack, ms));
    }
    window.addEventListener('resize', schedule);
    window.addEventListener('orientationchange', schedule);
    if (window.screen && screen.orientation && screen.orientation.addEventListener) {
	screen.orientation.addEventListener('change', schedule);
    }
    if (window.visualViewport) {
	window.visualViewport.addEventListener('resize', schedule);
	window.visualViewport.addEventListener('scroll', schedule);
    }
    // Coming back to the app after the phone was turned while it was hidden.
    document.addEventListener('visibilitychange', () => {
	if (document.visibilityState === 'visible') schedule();
    });
}

// The color of the current screen's background, for the parts of the screen
// around the page: the browser's toolbars (theme-color), and in a Home Screen
// app, the status bar and the strip at the top (#topEdge, see
// game_fullscreen.html).  If missing, iOS 26 blurs the top of a Home Screen
// app.
function setScreenColor(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--screen-color', color);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', color);
}
