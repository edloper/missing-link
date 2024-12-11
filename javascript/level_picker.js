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
	this.loadCookie();
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
	    this.saveCookie();
	    this.updateProgressBars();
	});
	this.saveCookie();
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
	this.saveCookie();
	// Reset all thumbnails.
	this.$container.find('.thumbnail').css({
	    "background-image": "url('images/thumbnail.png')"
	});
	this.updateProgressBars();
    }

    loadCookie() {
	const decodedCookie = decodeURIComponent(document.cookie);
	const cookieName = "MissingLink=";
	for (const cookie of decodedCookie.split(';')) {
	    while (cookie.charAt(0) == ' ') {
		cookie.cookie.substring(1);  // Trim leading space
	    }
	    if (cookie.indexOf(cookieName) == 0) {
		const jsonString = cookie.substring(cookieName.length, cookie.length);
		this.cookieData = JSON.parse(jsonString);
		break;
	    }
	}
	this.setCookieDefaults();
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
    
    saveCookie() {
	const value = JSON.stringify(this.cookieData);
	const daysToExpire = 30;
	const date = new Date();
	date.setTime(date.getTime() + (daysToExpire * 24 * 60 * 60 * 1000));
	const expires = "expires=" + date.toUTCString();
	document.cookie = "MissingLink=" + value + ";" + expires + ";path=/";
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
			    this.saveCookie();
			});
			this.game.setLevelCompleteCallback(() => {
			    // Display the thumbnail.
			    $thumbnail.css({
				"background-image": "url('"+thumbnail+"')"
			    });
			    // Unlock the next level.
			    const index = levelData.index;
			    console.log(index);
			    if (index < (this.levelUrls.length - 1)) {
				const nextUrl = this.levelUrls[index + 1];
				console.log(nextUrl);
				console.log(this.cookieData.levels[nextUrl].locked);
				this.cookieData.levels[nextUrl].locked = false;
				this.updateProgressBars();
			    }
			    this.saveCookie();
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
