/*
 * The main window for the game.
 *
 */

// HTML for the controls panel.
const GAME_CONTROLS_HTML = `
      <div class="controls">
	<button id="gameUndo" class="actionButton">
	  <img src="images/undo.png" title="Shortcut: Ctrl-z">
          <div class="label">Undo</div>
        </button>
        <div id="gameEasyMode"></div>
	<button id="gameHint" class="actionButton">
	  <img src="images/hint.png" title="Shortcut: h">
          <div class="label">Hint</div>
	</button>
      </div>
      <table class="controls" id="gameLoadFromFile">
	<tr>
	  <th align="right">
	    Load Game
	  </th>
	  <td>
	    <input type="file" id="gameLoad" accept="application/json">
	  </td>
	</tr>
      </table>
    </div>
`

// History about an action the user took.  This is used to implement the "undo" action.
class GameHistoryEvent {
    constructor(action, start, end) {
	console.assert((action == "add" || action == "remove"), "Unexpected action");
	console.assert(start instanceof Dot, "Expected a dot");
	console.assert(end instanceof Dot, "Expected a dot");
	this.action = action;
	this.start = start;
	this.end = end;
    }
}

class Game {
    constructor(container, width, height) {
	this.container = container
	this.$container = $(container)
	this.$container.append($("<div class='levelTitle'></div>"));
	this.$title = this.$container.find(".levelTitle");
	this.width = width  // used by mouse_controller.
	this.height = height  // used by mouse_controller.
	this.draw = SVG().addTo(container).size(width, height);
	$(container).addClass('missingLinkGame');
	this.setBackgroundColor({h: 0, s: 0, l: 80});
	this.draw.node.classList.add("graph");
	this.graph = new Graph(this.draw);
	this.mouseHandler = new MouseHandler(this);
	this.graph.setAlpha(1);
	this.easyMode = false;
	this.addControls();
	this.updateShadow();
	this.levelCompleteCallback = () => {};
	this.clear();
	this.progressCallback = null;
	this.backButtonCallback = null;
	this.backButtonFlashingInterval = null;
    }

    clear() {
	this.activeEdge = null;
	this.graph.clear();
	this.history = [];
	this.mouseHandler.zoomOut();
	this.$backButton.removeClass("finished");
	this.flashBackButton(false);
    }

    saveProgress() {
	if (this.progressCallback) {
	    // Only include edges with an end (not in-progress edge)
	    const edges = this.graph.edges.filter(edge => edge.end);
	    const numTrisShown = this.graph.tris.filter(tri => !tri.hidden).length;
	    const totalTris = this.graph.tris.length;
	    let progress = {}
	    if (numTrisShown == this.graph.tris.length) {
		progress.percentDone = 100;
		progress.finished = true;
		progress.edges = [];  // Do not record edges (max cookie length)
	    } else {
		progress.percentDone = Math.floor(100 * (numTrisShown/totalTris));
		progress.finished = false;
		progress.edges = edges.map(edge => [edge.start.index, edge.end.index]);
	    };
	    this.progressCallback(progress);
	}
    }

    loadProgress(progress) {
	if (progress.finished) {
	    this.hint(/*finishLevel=*/true);
	} else {
	    for (const edge of progress.edges ?? []) {
		this.addEdge(this.graph.dots[edge[0]], this.graph.dots[edge[1]],
			     /*saveProgress=*/ false);
	    }
	}
    }

    setProgressCallback(callback) {
	this.progressCallback = callback;
    }

    setBackButtonCallback(callback) {
	this.backButtonCallback = callback;
	this.$backButton.click(callback);
    }

    setLevelCompleteCallback(callback) {
	this.levelCompleteCallback = callback;
    }

    hide() {
	this.$container.hide();
    }

    show() {
	this.$container.show();
    }

    // Helper for the constructor -- add the controls for the game.
    addControls() {
	const $controls = $(GAME_CONTROLS_HTML);
	this.$container.append($controls);
	this.$container.find(".controls").css({width: this.width});
	$("#gameLoad").change(() => {
	    const file = $("#gameLoad")[0].files[0];
	    const reader = new FileReader();
	    reader.addEventListener(
		"load", () => {
		    // TODO: check if reader.result starts with:
		    // "data:application/json;base64,"
		    const base64Data = reader.result.split(',')[1];
		    const jsonString = atob(base64Data);
		    this.loadFromJson(jsonString);
		},
		false,
	    );

	    if (file) {
		reader.readAsDataURL(file);
	    }
	});

	$("#gameUndo")
	    .mousedown(e => { this.undo(); e.preventDefault(); })
	    .on('touchstart', e => { this.undo(); e.preventDefault(); });
	$("#gameHint")
	    .mousedown(e => { this.startHint(); e.preventDefault(); })
	    .on('touchstart', e => { this.startHint(); e.preventDefault(); })
	new ToggleButton($("#gameEasyMode"), {
	    label: "Easy Mode",
	    height: 30, width: 80,
	    margin: '10px',
	    offColor: '#888',
	    onColor: '#30d070',
	}).onClick((value) => {
	    this.setEasyMode(value);
	});
	document.addEventListener('keydown', event => {
	    if ( (event.ctrlKey || event.metaKey) && event.key === 'z' ) {
		this.undo();
	    }
	    else if ( event.key === 'h' ) {
		this.hint();
	    }
	    else if (event.key == 'Backspace') {
		if (this.backButtonCallback) {
		    this.backButtonCallback();
		}
	    }
	    if ( (event.ctrlKey || event.metaKey) && event.key === 'ArrowRight' ) {
		this.hint(/*finishLevel=*/true);
		this.saveProgress();
	    }
	    else {
		return;  // Do not preventDefault for unhandled keys.
	    }
	    event.preventDefault();
	});
	// Back button. 
	this.$backButton = $("<button class='gameBackButton' title='Shortcut: Backspace'></button>");
	this.$container.append(this.$backButton);
	window.addEventListener('popstate', (event) => { // browser "back" button
	    if (event.state == null) {
		window.history.pushState({}, ''); 
		if (this.backButtonCallback) {
		    event.preventDefault();
		    this.backButtonCallback();
		}
	    }
	});
	window.history.pushState({}, ''); 	
    }

    resize(width, height) {
	this.$container.find(".controls").css({width: width});
	this.draw.size(width, height);
    }

    loadFromPng(dataUrl) {
	PNGToString(dataUrl).then(s => this.loadFromJson(s));
    }

    loadFromUrl(url) {
	fetch(url)
	    .then(response => {
		if (!response.ok) { console.error('Error fetching', url); }
		response.text().then(value => {
		    this.loadFromJson(value);
		})
	    });
    }
    
    loadFromJson(jsonString) {
	this.clear();
	const extras = this.graph.loadFromJson(
	    jsonString,
	    (x, y) => {
		const dot = this.graph.addDot(x, y);
		dot.on('mousedown', (e) => { this.mouseHandler.mouseDown(e, dot); });
		dot.on('touchstart', (e) => { this.mouseHandler.mouseDown(e, dot); });
		return dot;
	    },
	    (corners, color) => {
		const tri = this.graph.addTri(corners, color);
		tri.hide();  // Start with all triangles hidden.
		tri.polygon.on('mousedown', (e) => { this.mouseHandler.mouseDown(e, tri); });
	    });
	if (extras.backgroundColor) {
	    this.setBackgroundColor(extras.backgroundColor);
	}
	this.$title.text(extras.title ?? "");
	for (let i = 0; i < this.graph.dots.length; i++) {
	    this.graph.dots[i].index = i;
	}
	this.findMaxEdges();
	this.updateShadow();
    }

    findMaxEdges() {
	// Find the "correct" number of edges connected to each dot.
	for (const dot of this.graph.dots) {
	    var neighbors = new Set();
	    for (const tri of dot.tris) {
		for (const corner of tri.corners) {
		    neighbors.add(corner.index);
		}
	    }
	    neighbors.delete(dot.index);
	    dot.maxEdges = neighbors.size;
	    dot.updateEdgeCount();
	}
    }

    undo() {
	if (this.history.length == 0) { return; }
	const undoEvent = this.history.pop();
	const action = undoEvent.action;
	const start = undoEvent.start;
	const end = undoEvent.end;
	if (action == "add") {
	    // Find a matching edge.
	    var edges = start.edges.filter(item =>
		((item.start.index == start.index) && (item.end.index == end.index)) ||
		    ((item.start.index == end.index) && (item.end.index == start.index)));
	    console.assert(edges.length==1, "Failed to find edge");
	    this.removeEdge(edges[0], /*animate=*/ true);
	} else if (action == "remove") {
	    const edge = this.addEdge(start, end);
	    edge.flash();
	}
    }

    isCorrectEdge(edge) {
	for (const tri of edge.start.tris) {
	    for (const corner of tri.corners) {
		if (corner === edge.end) {
		    return true;
		}
	    }
	}
	return false;
    }

    startHint() {
	this.hint();
	
	// If you hold down hint button, then do rapid-fire hints.
	this.holdingDownHint = true;
	$(window).mouseup(e => {this.endHint(); })
	$(window).on('touchend', e => { this.endHint(); })
	const nextHint = () => {
	    if (this.holdingDownHint) {
		this.hint();
		this.hintTimeoutId = setTimeout(nextHint, 70);
	    }
	}
	this.hintTimeoutId = setTimeout(nextHint, 1000);
    }

    endHint() {
	this.holdingDownHint = false;
	if (this.hintTimeoutId) {
	    clearTimeout(this.hintTimeoutId);
	    this.hintTimeoutId = null;
	}
    }

    hint(finishLevel = false) {
	// Look for incorrect edges that the player added.
	for (const dot of this.graph.dots) {
	    for (const edge of dot.edges) {
		if (!this.isCorrectEdge(edge)) {
		    this.removeEdge(edge, /*animate=*/ true);
		    this.history.push(new GameHistoryEvent("remove", edge.start, edge.end));
		    if (!finishLevel) {
			return;  // One hint at a time.
		    }
		}
	    }
	}
	
	// Look for edges that the player hasn't found yet.
	for (const dot of this.graph.dots) {
	    if (dot.numEdgesLeft() == 0) { continue; }
	    for (const tri of dot.tris) {
		for (const corner of tri.corners) {
		    if (corner.numEdgesLeft() == 0) { continue; }
		    if (!((dot == corner) ||
			  this.dotsAreConnectedByEdge(dot, corner))) {
			const edge = this.addEdge(dot, corner,
						  /*saveProgress=*/ !finishLevel);
			this.history.push(new GameHistoryEvent("add", dot, corner));
			if (!finishLevel) {
			    edge.flash();
			    return;  // Just do one at a time.
			}
		    }
		}
	    }
	}
    }

    setEasyMode(easyMode) {
	this.easyMode = easyMode;
	for (const dot of this.graph.dots) {
	    for (const edge of dot.edges) {
		edge.showIsCorrect(this.easyMode, this.isCorrectEdge(edge));
	    }
	}
    }
    removeTri(tri) {
	this.graph.removeTri(tri);
    }

    removeDot(dot) {
	this.graph.removeDot(dot);
    }

    addEdge(start, end, saveProgress=true) {
	var edge = this.graph.addEdge(start, end);
	edge.line.on('mousedown', (e) => { this.mouseHandler.mouseDown(e, edge); });
	edge.shadow.on('mousedown', (e) => { this.mouseHandler.mouseDown(e, edge); });
	edge.line.on('touchstart', (e) => { this.mouseHandler.touchStart(e, edge); });
	edge.shadow.on('touchstart', (e) => { this.mouseHandler.touchStart(e, edge); });
	this.revealTrianglesForEdge(edge);
	edge.showIsCorrect(this.easyMode, this.isCorrectEdge(edge));
	if (saveProgress) {
	    this.saveProgress();
	}
	return edge;
    }

    removeEdge(edge, animate = false) {
	this.graph.removeEdge(edge, animate);
	this.hideTrianglesForEdge(edge);
	this.saveProgress();
    }

    clickEdge(edge) {
	this.history.push(new GameHistoryEvent("remove", edge.start, edge.end));
	this.removeEdge(edge);
    }

    startDragDot(dot, x, y) {
	if (dot.numEdgesLeft() == 0) {
	    return;  // No room for new edges.
	}
	this.activeEdge = this.graph.addEdge(dot);
    }

    cancelDrag() {
	if (this.activeEdge) {
	    this.graph.removeEdge(this.activeEdge);
	    this.activeEdge = null;
	}
    }

    dragDot(dot, x, y) {
	if (!this.activeEdge) {
	    return;
	}
        const point = this.draw.point(x, y);
	this.activeEdge.drawTo(point.x, point.y);
    }

    endDragDot(dot, x, y) {
	if (!this.activeEdge) {
	    return;
	}
	const endDot = this.graph.closestDotTo(x, y)
	if (this.okToConnectActiveEdgeTo(endDot, x, y)) {
	    const startDot = this.activeEdge.start;
	    const edge = this.addEdge(startDot, endDot);
	    this.history.push(new GameHistoryEvent("add", startDot, endDot));
	    this.graph.removeEdge(this.activeEdge);
	} else {
	    this.graph.removeEdge(this.activeEdge, /*animate=*/ true);
	}
	this.activeEdge = null;
    }

    okToConnectActiveEdgeTo(endDot, x, y) {
	const startDot = this.activeEdge.start;
	if (endDot === null) {
	    return false;
	}
	if (endDot === startDot) {
	    return false;
	}
	if (this.dotsAreConnectedByEdge(startDot, endDot)) {
	    return false;
	}
	if (endDot.numEdgesLeft() <= 0) {
	    return false;
	}
	if (Math.hypot(endDot.x-x, endDot.y-y) > 40) {
	    return false;
	}
	for (const edge of this.graph.edges) {
	    if (edge.end && linesIntersect(edge.start, edge.end, startDot, endDot)) {
		console.log("Can't connect -- overlap edge!")
		return false;
	    }
	}
	return true;
    }

    dotsAreConnectedByEdge(dot1, dot2) {
	for (let edge of dot1.edges) {
	    if ((dot1 === edge.start && dot2 === edge.end) ||
		(dot2 === edge.start && dot1 === edge.end))
		return true;
	}
	return false;
    }

    hideTrianglesForEdge(edge) {
	const dot1 = edge.start;
	const dot2 = edge.end;
	for (const tri of dot1.tris) {
	    const corners = new Set(tri.corners.map(dot => dot.index));
	    if (corners.delete(dot1.index) && corners.delete(dot2.index)) {
		if (!tri.hidden) {
		    tri.hide();
		}
	    }
	}
    }

    revealTrianglesForEdge(edge) {
	const dot1 = edge.start;
	const dot2 = edge.end;
	for (const tri of dot1.tris) {
	    const corners = new Set(tri.corners.map(dot => dot.index));
	    if (corners.delete(dot1.index) && corners.delete(dot2.index)) {
		const dot3_index = Array.from(corners)[0];
		const dot3 = this.graph.dots[dot3_index];
		if (this.dotsAreConnectedByEdge(dot1, dot3) &&
		    this.dotsAreConnectedByEdge(dot2, dot3)) {
		    if (tri.hidden) {
			tri.show();
		    }
		}
	    }
	}
	const numTrisShown = this.graph.tris.filter(tri => !tri.hidden).length;
	if (numTrisShown == this.graph.tris.length) {
	    this.levelComplete();
	}
    }

    setBackgroundColor(hsl) {
	if (hsl.h === null || hsl.s === null || hsl.l === null) {
	    console.error("Expected HSL color, got", hsl)
	    return;
	}
	this.backgroundColor = hsl;
	this.draw.css({background: "hsl("+hsl.h+","+hsl.s+"%,"+hsl.l+"%)"});
    }

    levelComplete() {
	// Zoom out.
	this.mouseHandler.zoomOut();
	this.levelCompleteShadow();
	if (Math.random() > 0.5) {
	    drawConfetti(this.draw);
	} else {
	    drawFireworks(this.draw);
	}
	this.levelCompleteCallback();
	this.flashBackButton(true);
    }
    
    // The shadow indicates whether we've won this level or not.
    updateShadow() {
	const numTrisShown = this.graph.tris.filter(tri => !tri.hidden).length;
	if (numTrisShown == this.graph.tris.length) {
	    this.draw.css({"box-shadow": " 0px 0px 25px rgba(0, 255, 0, 1)"});
	} else {
	    this.draw.css({"box-shadow": " 0px 0px 8px rgba(0, 0, 0, 0.5)"});
	}
    }

    levelCompleteShadow() {
	// Flash the background's luminance from bright to dark.
	var x = 0;
	let intervalId = setInterval(()=> {
	    this.draw.css({
		"box-shadow":
		" 0px 0px "+(8+x/15)+"px rgba(0,"+x+",0,"+(.5+x/512)+")"
	    });
	    x += 20
	    if (x > 255) {
		// TODO: don't hard code this - return to original value?
		// Alternatively, leave this here but reset when we load a level??
		//this.draw.css({"box-shadow": " 0px 0px 8px rgba(0, 0, 0, 0.5)"});
		clearInterval(intervalId);
	    }
	}, 20);
    }

    flashBackButton(isFlashing) {
	if (this.backButtonFlashingInterval) {
	    clearInterval(this.backButtonFlashingInterval);
	    this.backButtonFlashingInterval = null;
	}
	if (isFlashing) {
	    this.$backButton.addClass("flashing");
	    var x = 128;
	    var dx = 4;
	    this.backButtonFlashingInterval = setInterval(()=> {
		this.$backButton.css({"border-color": "rgb(0,"+x+",0)"});
		x += dx;
		if ((x > 254) || (x < 128)) {
		    dx = -dx;
		}
	    }, 30);
	} else {
	    this.$backButton.removeClass("flashing");
	}
    }
}


		     
