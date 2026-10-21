/*

  - Pick which level you want to play.
  - Shows a grid of thumnails.
  - Starts out with a generic thumbnail if you haven't finished it yet.
  - shows title of each level
  - Once you finish, shows the level-specific thumbnail.
  
  */

const PROGRESS_STORAGE_KEY = "MissingLink_progress";
const HIDE_HOME_SCREEN_TIP_KEY = "MissingLink_hideHomeScreenTip";

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
    if (typeof data?.levels != "object" || data.levels === null) {
	throw new Error("it doesn't contain any progress");
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
	this.$resetButton.click(() => {
	    this.$resetConfirm.dialog({
		resizable: false,
		height: "auto",
		width: 400,
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

    // On iPhone and iPad, Safari deletes a site's saved data if the site isn't
    // used for 7 days, but not for sites added to the Home Screen.  Suggest
    // that (unless we're already running from the Home Screen).
    addHomeScreenTip() {
	const isIOS = (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
		       (navigator.platform == "MacIntel" && navigator.maxTouchPoints > 1));
	const isStandalone = (navigator.standalone === true ||
			      window.matchMedia("(display-mode: standalone)").matches);
	if (!isIOS || isStandalone ||
	    localStorage.getItem(HIDE_HOME_SCREEN_TIP_KEY)) {
	    return;
	}
	const $tip = $(
	    "<div class='homeScreenTip'>" +
	    "<button class='closeTip' title='Hide this tip'>&times;</button>" +
	    "<b>Tip:</b> Safari may erase your progress if you don't play for a " +
	    "week.  To keep it, tap Share, then \"Add to Home Screen\", and play " +
	    "from the Home Screen.  (The Home Screen game starts fresh: use " +
	    "Save Code to bring your progress with you.)" +
	    "</div>");
	$tip.find(".closeTip").click(() => {
	    try {
		localStorage.setItem(HIDE_HOME_SCREEN_TIP_KEY, "1");
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
	    levels = JSON.parse(localStorage.getItem(PROGRESS_STORAGE_KEY))?.levels;
	} catch (e) {
	    console.error("Unable to load progress", e);
	}
	const fromCookies = !levels;
	if (fromCookies) {
	    levels = this.loadLevelsFromCookies();
	}
	this.savedData = {levels: levels};

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
	this.setDefaults();

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

    // Loads progress saved in cookies by older versions of the game.
    loadLevelsFromCookies() {
	const decodedCookie = decodeURIComponent(document.cookie);
	const levels = {};
	for (const levelUrl of this.levelUrls) {
	    const levelData = this.loadCookie(decodedCookie, "MissingLink_"+levelUrl);
	    if (levelData) {
		levels[levelUrl] = levelData;
	    }
	}
	return levels;
    }

    // Loads a cookie with a given name, given the decoded document.cookie.
    loadCookie(decodedCookie, cookieName) {
	const prefix = cookieName+"=";
	for (let cookie of decodedCookie.split(';')) {
	    while (cookie.charAt(0) == ' ') {
		cookie = cookie.substring(1);  // Trim leading space
	    }
	    if (cookie.indexOf(prefix) == 0) {
		const jsonString = cookie.substring(prefix.length, cookie.length);
		try {
		    return JSON.parse(jsonString);
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
    }

    show() {
	this.$container.show();
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
