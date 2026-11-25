/*

  - Pick which level you want to play.
  - Shows a grid of thumnails.
  - Starts out with a generic thumbnail if you haven't finished it yet.
  - shows title of each level
  - Once you finish, shows the level-specific thumbnail.
  
  */

const PROGRESS_STORAGE_KEY = "MissingLink_progress";
// "never" after "Don't show again" (or "1", from the old tip's close
// button), or the time of the last "Not now".
const HIDE_HOME_SCREEN_TIP_KEY = "MissingLink_hideHomeScreenTip";
const HOME_SCREEN_TIP_SNOOZE_MS = 20 * 3600 * 1000;

// iOS's own icons for Share, Add to Home Screen and View More (as in iOS 26),
// drawn to follow the text color.
const IOS_ICONS = {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 9.5H6.5v11.5h11V9.5h-2"/><path d="M12 14.5V2.5M8.5 6 12 2.5 15.5 6"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4.5"/><path d="M12 8v8M8 12h8"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="11" fill="#d9dcdc" stroke="none"/><path d="M7 10l5 5 5-5"/></svg>',
};

function isProgressObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Missing fields are allowed for older saves and receive defaults on load.
function isValidSavedLevel(data) {
    if (!isProgressObject(data) ||
	(data.locked !== undefined && typeof data.locked !== 'boolean') ||
	(data.index !== undefined && (!Number.isInteger(data.index) || data.index < 0))) {
	return false;
    }
    if (data.progress === undefined) { return true; }
    const progress = data.progress;
    if (!isProgressObject(progress) ||
	(progress.finished !== undefined && typeof progress.finished !== 'boolean') ||
	(progress.percentDone !== undefined &&
	 (!Number.isFinite(progress.percentDone) || progress.percentDone < 0 || progress.percentDone > 100))) {
	return false;
    }
    return progress.edges === undefined ||
	(Array.isArray(progress.edges) && progress.edges.every(edge =>
	    Array.isArray(edge) && edge.length === 2 &&
	    edge.every(index => Number.isInteger(index) && index >= 0)));
}

// Save codes are "ML1-" followed by the progress json, deflate-compressed
// and base64-encoded ("ML0-" if the browser can't compress).
async function encodeSaveCode(data) {
    let bytes = new TextEncoder().encode(JSON.stringify(data));
    let prefix = "ML0-";
    if (window.CompressionStream) {
	const stream = new Blob([bytes]).stream()
	      .pipeThrough(new CompressionStream("deflate"));
	bytes = new Uint8Array(await new Response(stream).arrayBuffer());
	prefix = "ML1-";
    }
    let binary = "";
    for (const b of bytes) {
	binary += String.fromCharCode(b);
    }
    return prefix + btoa(binary);
}

async function decodeSaveCode(code) {
    code = code.replace(/\s/g, "");
    const prefix = code.slice(0, 4);
    if (prefix != "ML0-" && prefix != "ML1-") {
	throw new Error("it should start with ML1-");
    }
    let bytes;
    try {
	bytes = Uint8Array.from(atob(code.slice(4)), c => c.charCodeAt(0));
    } catch (e) {
	throw new Error("it isn't complete (check that you copied all of it)");
    }
    if (prefix == "ML1-") {
	if (!window.DecompressionStream) {
	    throw new Error("this browser is too old to read it");
	}
	try {
	    const stream = new Blob([bytes]).stream()
		  .pipeThrough(new DecompressionStream("deflate"));
	    bytes = new Uint8Array(await new Response(stream).arrayBuffer());
	} catch (e) {
	    throw new Error("it isn't complete (check that you copied all of it)");
	}
    }
    let data;
    try {
	data = JSON.parse(new TextDecoder().decode(bytes));
    } catch (e) {
	throw new Error("it isn't complete (check that you copied all of it)");
    }
    if (!isProgressObject(data?.levels) || !Object.values(data.levels).every(isValidSavedLevel)) {
	throw new Error("it doesn't contain valid progress");
    }
    return data;
}

class LevelPicker {
    constructor(container, game, levelUrls) {
	this.levelUrls = levelUrls;
	this.load();
	this.game = game;
	this.$container = $(container);
	this.$grid = $("<div class='levelPickerGrid'>");
	this.$container.append(this.$grid);
	this.$rows = [];
	this.numColumns = 4;
	this.draw = SVG();
	this.titles = [];
	this.$grid.width(this.numColumns * 120);
	window.addEventListener('resize', () => this.fitGrid());
	// The title image's height moves the grid.
	window.addEventListener('load', () => this.fitGrid());
	this.urlToThumbnail = {};
	
	for (let i = 0; i < levelUrls.length; i += this.numColumns) {
	    const row = Math.floor(i / this.numColumns);
	    const $row = $("<div class='row'>");
	    this.$grid.append($row);
	    this.$rows.push($row);
	}

	for (let i = 0; i < levelUrls.length; i++) {
	    const row = Math.floor(i / this.numColumns);
	    const col = i % this.numColumns;
	    this.addThumbnail(levelUrls[i], row, col);
	}
	this.game.setBackButtonCallback(() => {
	    this.game.hide();
	    this.show();
	    this.updateProgressBars();
	});
	this.$resetConfirm = $("<div class='resetConfirm' title='Reset Progress?'>" +
			       "Are you sure?  This can not be undone.</div>");
	this.$container.append(this.$resetConfirm)
	this.$buttons = $("<div class='levelPickerButtons'></div>");
	this.$container.append(this.$buttons);
	this.$saveCodeButton = $("<button class='levelPickerButton'>Save Code</button>");
	this.$buttons.append(this.$saveCodeButton);
	this.$saveCodeButton.click(() => this.showSaveCodeDialog());
	this.$resetButton = $("<button class='levelPickerButton'>Reset Progress</button>");
	this.$buttons.append(this.$resetButton)
	this.addHomeScreenTip();
	this.fitGrid();
	this.$resetButton.click(() => {
	    this.$resetConfirm.dialog({
		resizable: false,
		height: "auto",
		width: Math.min(400, window.innerWidth - 20),
		modal: true,
		buttons: {
		    "Reset": () => {
			this.resetProgress();
			this.$resetConfirm.dialog("close");
		    },
		    "Cancel": () => {
			this.$resetConfirm.dialog("close");
		    }
		}
	    })
	});
    }

    // On iPhone and iPad, in a browser tab, suggest adding the game to the
    // Home Screen: Safari deletes a site's saved data if the site isn't used
    // for 7 days, but not for sites opened from the Home Screen.  The Home
    // Screen game has its own, separate storage, so explain how to bring
    // progress across with a save code.
    addHomeScreenTip() {
	// navigator.standalone exists only on iPhone and iPad: false in a
	// browser tab, true when opened from the Home Screen.
	if (navigator.standalone !== false) {
	    return;
	}
	try {
	    const hidden = localStorage.getItem(HIDE_HOME_SCREEN_TIP_KEY);
	    if (hidden && (isNaN(Number(hidden)) || hidden === "1" ||
			   Date.now() - Number(hidden) < HOME_SCREEN_TIP_SNOOZE_MS)) {
		return;
	    }
	} catch (e) {}  // Storage blocked: show the tip.
	const levels = Object.values(this.savedData?.levels ?? {});
	const finished = levels.filter(data => data.progress?.finished).length;
	const started = levels.filter(data => data.progress?.percentDone > 0).length;
	const icon = name => "<span class='iosIcon' aria-hidden='true'>" + IOS_ICONS[name] + "</span>";
	let moveAcross;
	if (started == 0) {
	    moveAcross = "Switch before you start.";
	} else {
	    const what = (finished == 0) ? "progress" :
		  (finished == 1) ? "1 finished level" : finished + " finished levels";
	    moveAcross = "To bring your " + what + " across, tap <b>Save Code</b> " +
		"here and <b>Copy Code</b>, then in the Home Screen game tap " +
		"<b>Save Code</b>, paste the code and tap <b>Load Code</b>.";
	}
	const $tip = $(
	    "<div class='homeScreenTip' role='note'>" +
	    "<p class='tipTitle'>Add Missing Link to the Home Screen</p>" +
	    "<p><b>Why:</b> in a browser tab, your progress can be lost. The " +
	    "browser may clear a site's saved data when it hasn't been opened " +
	    "for a while (about a week in Safari), or when someone clears the " +
	    "browser's history. From the Home Screen your progress is kept, " +
	    "and the game fills the screen.</p>" +
	    "<p><b>How:</b> tap <b>Share</b> " + icon("share") + ", then " +
	    "<b>Add to Home Screen</b> " + icon("add") + ". If it isn't in the " +
	    "list, it may be under <b>View More</b> " + icon("more") + ". Then " +
	    "open Missing Link from its new icon.</p>" +
	    "<p class='tipWarning'><b>Note:</b> the Home Screen game keeps its " +
	    "own progress and starts with only the first level open. " +
	    moveAcross + "</p>" +
	    "<div class='tipButtons'>" +
	    "<button type='button' data-hide='never'>Don't show again</button>" +
	    "<button type='button' data-hide='later'>Not now</button>" +
	    "</div></div>");
	$tip.find("button").click(event => {
	    const hide = $(event.currentTarget).data("hide");
	    try {
		localStorage.setItem(HIDE_HOME_SCREEN_TIP_KEY,
				     hide == "never" ? "never" : String(Date.now()));
	    } catch (e) {}
	    $tip.remove();
	});
	this.$container.append($tip);
    }

    // Shows a dialog where the player can copy a "save code" with their
    // progress, or paste one to restore progress (e.g., on another device, or
    // after the browser deleted its saved data).
    showSaveCodeDialog() {
	const $dialog = $(
	    "<div class='saveCodeDialog' title='Save Code'>" +
	    "<p>Copy this code and keep it somewhere safe.  You can use it to " +
	    "get your progress back, or to move it to another device.</p>" +
	    "<textarea class='saveCodeOut' readonly></textarea>" +
	    "<p>To restore progress, paste a save code here:</p>" +
	    "<textarea class='saveCodeIn'></textarea>" +
	    "<p class='saveCodeMessage'></p>" +
	    "</div>");
	const $out = $dialog.find(".saveCodeOut");
	const $in = $dialog.find(".saveCodeIn");
	const $message = $dialog.find(".saveCodeMessage");
	encodeSaveCode({levels: this.savedData.levels})
	    .then(code => $out.val(code))
	    .catch(e => $message.text("Unable to make a save code: " + e));
	$out.on('focus click', () => $out.select());
	$dialog.dialog({
	    resizable: false,
	    height: "auto",
	    width: Math.min(450, window.innerWidth - 20),
	    modal: true,
	    close: () => $dialog.remove(),
	    buttons: {
		"Copy Code": () => {
		    $out.select();
		    navigator.clipboard.writeText($out.val())
			.then(() => $message.text("Copied."))
			.catch(() => $message.text("Select the code and copy it."));
		},
		"Load Code": () => {
		    decodeSaveCode($in.val())
			.then(data => {
			    if (confirm("Replace your current progress with the " +
					"progress in this save code?")) {
				this.savedData = {levels: data.levels};
				this.save();
				location.reload();
			    }
			})
			.catch(e => $message.text("That save code didn't work: " +
						  e.message));
		},
		"Close": () => $dialog.dialog("close"),
	    }
	});
    }

    resetProgress() {
	this.savedData = {};
	this.setDefaults();
	this.save();
	// Reset all thumbnails.
	this.$container.find('.thumbnail').css({
	    "background-image": "url('images/thumbnail.png')"
	});
	this.updateProgressBars();
    }

    setDefaults() {
	this.savedData ??= {};
	this.savedData.levels ??= {};
	for (let i = 0; i < this.levelUrls.length; i++) {
	    const levelUrl = this.levelUrls[i];
	    this.savedData.levels[levelUrl] ??= {};
	    this.savedData.levels[levelUrl].progress ??= {};
	    this.savedData.levels[levelUrl].progress.finished ??= false;
	    this.savedData.levels[levelUrl].progress.percentDone ??= 0;
	    this.savedData.levels[levelUrl].progress.edges ??= [];
	    this.savedData.levels[levelUrl].locked ??= true;
	    this.savedData.levels[levelUrl].index = i
	}
       this.savedData.levels[this.levelUrls[0]].locked = false;
    }

    // Progress is saved in localStorage.  (Older versions used one cookie
    // per level, but cookies expire and are limited to about 4KB, which is
    // too small for the edges of a big level.)
    load() {
	let levels = null;
	try {
	    const stored = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY))?.levels;
	    if (isProgressObject(stored)) {
		// Retain usable records if another record was corrupted.
		levels = Object.fromEntries(Object.entries(stored).filter(
		    ([url, data]) => isValidSavedLevel(data)));
	    }
	} catch (e) {
	    console.error("Unable to load progress", e);
	}
	const fromCookies = !levels;
	if (fromCookies) {
	    levels = this.loadLevelsFromCookies();
	}
	this.savedData = {levels: levels};

	this.setDefaults();
	var prevLevelIsFinished = true;
	for (let i = 0; i < this.levelUrls.length; i++) {
	    const levelData = levels[this.levelUrls[i]];
	    if (levelData) {
		if (prevLevelIsFinished) {
		    levelData.locked = false;
		}
		prevLevelIsFinished = levelData.progress?.finished ?? false;
	    }
	}
	if (fromCookies && Object.keys(levels).length > 0 && this.save()) {
	    this.deleteOldCookies();
	}
    }

    save() {
	try {
	    localStorage.setItem(PROGRESS_STORAGE_KEY,
				 JSON.stringify({levels: this.savedData.levels}));
	    return true;
	} catch (e) {
	    console.error("Unable to save progress", e);
	    return false;
	}
    }

    // Asks the browser not to delete saved progress (e.g., when it is low on
    // space).  Some browsers ask the player first, so this is only done once
    // a level has been finished.
    requestPersistentStorage() {
	if (this.persistRequested || !navigator.storage?.persist) {
	    return;
	}
	this.persistRequested = true;
	navigator.storage.persisted()
	    .then(persisted => persisted || navigator.storage.persist())
	    .catch(e => console.error("Unable to request persistent storage", e));
    }

    // Decode each matching value independently; unrelated cookies may contain %.
    loadLevelsFromCookies() {
	const levels = {};
	for (const levelUrl of this.levelUrls) {
	    const levelData = this.loadCookie(document.cookie, "MissingLink_"+levelUrl);
	    if (isValidSavedLevel(levelData)) {
		levels[levelUrl] = levelData;
	    }
	}
	return levels;
    }

    // Loads a cookie with a given name, given document.cookie.
    loadCookie(cookieString, cookieName) {
	const prefix = cookieName+"=";
	for (let cookie of cookieString.split(';')) {
	    while (cookie.charAt(0) == ' ') {
		cookie = cookie.substring(1);  // Trim leading space
	    }
	    if (cookie.indexOf(prefix) == 0) {
		const jsonString = cookie.substring(prefix.length, cookie.length);
		try {
		    return JSON.parse(decodeURIComponent(jsonString));
		} catch (e) {
		    console.error("Unable to parse cookie", cookieName, e);
		    return null;
		}
	    }
	}
	return null;
    }

    deleteOldCookies() {
	for (const cookie of document.cookie.split(";")) {
	    const name = cookie.split("=")[0].trim();
	    if (name.startsWith("MissingLink_")) {
		document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
	    }
	}
    }

    hide() {
	this.$container.hide();
	setScreenColorIfAvailable(this.game?.backgroundCss);
    }

    show() {
	this.$container.show();
	setScreenColorIfAvailable("#fff");
	this.fitGrid();
    }

    // Shrink the grid of levels on a small screen, so that it fits across,
    // and (down to half size) so that the title, the grid and the buttons
    // fit on the screen without scrolling.
    fitGrid() {
	if (!this.$grid || !this.$container.is(":visible")) {
	    return;
	}
	const grid = this.$grid[0];
	grid.style.zoom = 1;
	const width = grid.offsetWidth;
	const height = grid.offsetHeight;
	const container = this.$container[0];
	const top = grid.getBoundingClientRect().top - container.getBoundingClientRect().top;
	const below = this.$buttons.outerHeight(true) + 10;
	const zoom = Math.min(1, (container.clientWidth - 16) / width,
			      Math.max(0.5, (container.clientHeight - top - below) / height));
	grid.style.zoom = zoom;
    }
    
    addThumbnail(url, row, col) {
	const $thumbnail = $("<button class='thumbnail'>" +
			     "<div class='levelLocked'></div>" + 
			     "<div class='levelProgressBar'>" +
			     "<div class='progress'>" +
			     "</div></div></button>");
	this.urlToThumbnail[url] = $thumbnail;
	this.$rows[row].append($thumbnail);	
	fetch(url)
	    .then(response => {
		if (!response.ok) {
		    console.error('Error fetching', url, response.status);
		    return;
		}
		response.text().then(value => {
		    const root = JSON.parse(value);
		    const title = root.extras.title;
		    const backgroundColor = root.extras.backgroundColor;
		    const thumbnail = root.extras.thumbnail ?? "images/thumbnail.png";
		    var imgUrl = this.savedData.levels[url].progress.finished ? 
			thumbnail : "images/thumbnail.png";
		    $thumbnail.css({
			"background-image": "url('"+imgUrl+"')",
			"background-size": "100% 100%",
			"background-repeat": "no-repeat",

		    });
		    $thumbnail.click(() => {
			const levelData = this.savedData.levels[url];
			if (levelData.locked) {
			    this.flashLock(url);
			    return;  // Level is locked
			}
			this.game.show();
			this.game.setProgressCallback((progress) => {
			    levelData.progress = progress;
			    if (progress.finished) {
				this.requestPersistentStorage();
				// Display the thumbnail.
				$thumbnail.css({
				    "background-image": "url('"+thumbnail+"')"
				});
				// Unlock the next level.
				const index = levelData.index;
				if (index < (this.levelUrls.length - 1)) {
				    const nextUrl = this.levelUrls[index + 1];
				    this.savedData.levels[nextUrl].locked = false;
				    this.updateProgressBars();
				}
			    }
			    this.save();
			});
			this.game.loadFromJson(value);
			if (levelData.progress) {
			    this.game.loadProgress(levelData.progress);
			}
			this.hide();
		    });
		    this.updateProgressBars();
		})
	    });
    }

    flashLock(url) {
	const $thumbnail = this.urlToThumbnail[url];
	const $lock = $thumbnail.find(".levelLocked");
	var r = 255;
	let intervalId = setInterval(()=> {
	    const g = 600 - 2*r;
	    $lock.css({"background-color": "rgba("+r+","+g+","+g+",0.8)"});
	    r -= 5;
	    if (r < 200) {
		clearInterval(intervalId);
	    }
	}, 20);
    }

    updateProgressBars() {
	for (const url in this.urlToThumbnail) {
	    const percentDone = this.savedData.levels[url].progress.percentDone;
	    const $thumbnail = this.urlToThumbnail[url];
	    const $progressBar = $thumbnail.find(".levelProgressBar");
	    const $progress = $progressBar.find(".progress");
	    if (percentDone) {
		$progressBar.show();
		$progress.css({width: percentDone+"%"});
	    } else {
		$progressBar.hide();
	    }
	    if (this.savedData.levels[url].locked) {
		$thumbnail.find(".levelLocked").show();
	    } else {
		$thumbnail.find(".levelLocked").hide();
	    }
	}
	// Also update locks.
    }
}

// The page's color behind the current screen (viewport.js), if the page has it.
function setScreenColorIfAvailable(color) {
    if (typeof setScreenColor === "function") {
	setScreenColor(color);
    }
}
