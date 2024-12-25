/*

  - Pick which level you want to play.
  - Shows a grid of thumnails.
  - Starts out with a generic thumbnail if you haven't finished it yet.
  - shows title of each level
  - Once you finish, shows the level-specific thumbnail.
  
  */

class LevelPicker {
    constructor(container, game, levelUrls) {
	this.levelUrls = levelUrls;
	this.loadCookies();
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
	this.$resetButton = $("<button class='resetProgress'>Reset Progress</button>");
	this.$container.append(this.$resetButton)
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

    resetProgress() {
	this.cookieData = {};
	this.setCookieDefaults();
	this.saveCookies();
	// Reset all thumbnails.
	this.$container.find('.thumbnail').css({
	    "background-image": "url('images/thumbnail.png')"
	});
	this.updateProgressBars();
    }

    setCookieDefaults() {
	this.cookieData ??= {};
	this.cookieData.levels ??= {};
	for (let i = 0; i < this.levelUrls.length; i++) {
	    const levelUrl = this.levelUrls[i];
	    this.cookieData.levels[levelUrl] ??= {};
	    this.cookieData.levels[levelUrl].progress ??= {};
	    this.cookieData.levels[levelUrl].progress.finished ??= false;
	    this.cookieData.levels[levelUrl].progress.percentDone ??= 0;
	    this.cookieData.levels[levelUrl].progress.edges ??= [];
	    this.cookieData.levels[levelUrl].locked ??= true;
	    this.cookieData.levels[levelUrl].index = i
	}
       this.cookieData.levels[this.levelUrls[0]].locked = false;
    }

    loadCookies() {
	const decodedCookie = decodeURIComponent(document.cookie);
	this.cookieData ??= {};
	this.cookieData.levels ??= {};

	var prevLevelIsFinished = true;
	for (let i = 0; i < this.levelUrls.length; i++) {
	    const levelUrl = this.levelUrls[i];
	    const cookieName = "MissingLink_"+levelUrl;
	    const levelData = this.loadCookie(decodedCookie, cookieName);
	    if (levelData) {
		this.cookieData.levels[levelUrl] = levelData;
		if (prevLevelIsFinished) {
		    levelData.locked = false;
		}
		prevLevelIsFinished = levelData.progress.finished;
	    }
	}
	this.setCookieDefaults();

	const finishedLevels = this.loadCookie(decodedCookie, "MissingLink_finished");
	// TODO: Actually use this cookie. (Still evaluating if I want to store it
	// as ints or level urls, etc)
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
		return JSON.parse(jsonString);
	    }
	}
    }

    saveCookies() {
	this.levelUrls.forEach(levelUrl => this.saveLevelCookie(levelUrl));
	this.saveFinishedLevelsCookie();
    }

    saveFinishedLevelsCookie() {
	// Save a high-priority cookie with the list of finished levels.  It's
	// more important to keep this than the actual progress details.  Though
	// note that if we re-order levels then this can produce incorrect results.
	var finishedLevels = [];
	for (let i = 0; i < this.levelUrls.length; ++i) {
	    const levelUrl = this.levelUrls[i];
	    if (this.cookieData.levels[levelUrl].progress.finished) {
		finishedLevels.push(i);
	    }
	}
	this.saveCookie("MissingLink_finished",
			finishedLevels, /*priority=*/ "High");
    }

    saveLevelCookie(levelUrl) {
	this.saveCookie("MissingLink_"+levelUrl,
			this.cookieData.levels[levelUrl]);
    }
    
    saveCookie(cookieName, jsonValue, priority="Medium") {
	const jsonString = JSON.stringify(jsonValue);
	const daysToExpire = 30;
	const date = new Date();
	date.setTime(date.getTime() + (daysToExpire * 24 * 60 * 60 * 1000));
	document.cookie = (cookieName + "=" + jsonString
			   + ";expires=" + date.toUTCString()
			   + ";Priority=" + priority 
			   + ";path=/");
    }

    clearCookies() { // For debugging
	const cookies = document.cookie.split(";");
	for (let i = 0; i < cookies.length; i++) {
	    const cookie = cookies[i];
	    const eqPos = cookie.indexOf("=");
	    const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
	    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
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
		if (!response.ok) { console.error('Error fetching', url); }
		response.text().then(value => {
		    const root = JSON.parse(value);
		    const title = root.extras.title;
		    const backgroundColor = root.extras.backgroundColor;
		    const thumbnail = root.extras.thumbnail ?? "images/thumbnail.png";
		    var imgUrl = this.cookieData.levels[url].progress.finished ? 
			thumbnail : "images/thumbnail.png";
		    $thumbnail.css({
			"background-image": "url('"+imgUrl+"')",
			"background-size": "100% 100%",
			"background-repeat": "no-repeat",

		    });
		    $thumbnail.click(() => {
			const levelData = this.cookieData.levels[url];
			if (levelData.locked) {
			    this.flashLock(url);
			    return;  // Level is locked
			}
			this.game.show();
			this.game.setProgressCallback((progress) => {
			    levelData.progress = progress;
			    this.saveLevelCookie(url);
			    if (progress.finished) {
				// Display the thumbnail.
				$thumbnail.css({
				    "background-image": "url('"+thumbnail+"')"
				});
				// Unlock the next level.
				const index = levelData.index;
				if (index < (this.levelUrls.length - 1)) {
				    const nextUrl = this.levelUrls[index + 1];
				    this.cookieData.levels[nextUrl].locked = false;
				    this.saveLevelCookie(nextUrl);
				    this.updateProgressBars();
				}
			    }
			    this.saveFinishedLevelsCookie();
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
	    const percentDone = this.cookieData.levels[url].progress.percentDone;
	    const $thumbnail = this.urlToThumbnail[url];
	    const $progressBar = $thumbnail.find(".levelProgressBar");
	    const $progress = $progressBar.find(".progress");
	    if (percentDone) {
		$progressBar.show();
		$progress.css({width: percentDone+"%"});
	    } else {
		$progressBar.hide();
	    }
	    if (this.cookieData.levels[url].locked) {
		$thumbnail.find(".levelLocked").show();
	    } else {
		$thumbnail.find(".levelLocked").hide();
	    }
	}
	// Also update locks.
    }
}
