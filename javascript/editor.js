/*
 * The main window for the level editor.
 *
 */

// HTML for the controls panel.
const EDITOR_CONTROLS_HTML = `
      <table class="controls">
	<tr class="textInput">
	  <th align="right">Title</th>
	  <td>
	    <input type="text" id="editorTitle"
               placeholder="A phrase that hints at the solution">
	  </td>
	</tr>
	<tr class="textInput">
	  <th align="right">Save&nbsp;Game</th>
	  <td>
	    <input type="text" id="editorSaveFileName" placeholder="Filename">
	  </td>
	</tr>
	<tr>
	  <th align="right">Load&nbsp;Game</th>
	  <td>
	    <input type="file" id="editorLoad" accept="application/json">
	  </td>
	</tr>
	<tr>
	  <th align="right">Delete&nbsp;Level</th>
	  <td>
	    <button id="editorDeleteGame">DELETE</button>
	  </td>
	</tr>
      </table>
      <table class="controls">
	<tr>
	  <th align="right">Load Image</th>
	  <td>
	    <input type="file" id="editorLoadBackground" accept="image/*">
	  </td>
	</tr>
	<tr>
	  <th align="right">Image Opacity</th>
	  <td>
	    <div id="editorBackgroundOpacitySlider" class="slider"></div>
	  </td>
	</tr>
	<tr>
	  <th align="right">Hide Dots</th>
	  <td>
	    <input type="checkbox" id="editorHideDots"/>
	  </td>
	</tr>
	<tr>
	  <th align="right">Background Color</th>
	  <td>
	    <div id="editorBackgroundColorPicker"></div>
	  </td>
	</tr>
      </table>
`

// History about an action the user took.  This is used to implement the "undo" action.
//
// Actions that can be undone:
//   * addDot
//   * moveDot
//   * removeDot
//   * addTri
//   * removeTri
//   * setBackgroundColor
//   * setImage
//   * deleteLevel
//   * loadFromJson
class EditorHistoryEvent {
    constructor(action, args) {
	this.action = action;
	this.args = args;
    }
}

class LevelEditor {
    constructor(container, width, height) {
	this.history = [];
	this.container = container
	this.width = width
	this.height = height
	this.draw = SVG().addTo(container).size(width, height);
	this.backgroundColor = '#eee'
	this.draw.css({background: this.backgroundColor, border: '1px solid black'});
	this.draw.node.classList.add("graph");
	this.graph = new Graph(this.draw);
	this.selection = []  // up to 0-3 dots.
	this.mouseHandler = new MouseHandler(this);
	this.image = null;
	this.imageFilename = null;
	this.imageOpacity = 100;
	this.colorLookupCanvas = new ColorLookupCanvas(width, height, () => this.updateTriColors());
	this.graph.setAlpha(1.0);
	this.thumbnailPngDataUrl = null;
	this.addControls();
	this.history = [];
    }

    // Helper for the constructor -- add controls for the editor.
    addControls() {
	const $controls = $(EDITOR_CONTROLS_HTML);
	$(this.container).append($controls);
	$(this.container).find(".controls").css({width: this.width});
	$("#editorSaveFileName").keypress((e) => {
	    const filename = $("#editorSaveFileName").val();
	    if (e.which == 13 && filename != "") {
		this.saveLevel(filename);
	    }
	});
	$("#editorLoad").change(() =>{
	    const file = $("#editorLoad")[0].files[0];
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
	$("#editorLoadBackground").change(() => {
	    const file = $("#editorLoadBackground")[0].files[0];
	    const reader = new FileReader();
	    reader.addEventListener(
		"load", () => {
		    this.setImage(reader.result, file.name);
		},
		false,
	    );

	    if (file) {
		reader.readAsDataURL(file);
	    }
	});
	$("#editorDeleteGame").click(() => {
	    this.history.push(new EditorHistoryEvent('deleteLevel', {
		json: this.saveToJson()
	    }));
	    this.clear();
	});
	$("#editorBackgroundOpacitySlider").slider({
	    min: 0,
	    max: 100,
	    value: 100,
	    change: (event, ui) => {
		this.setImageOpacity(ui.value/100.0);
	    }
	});
	$("#editorHideDots").change(() => {
	    if ($("#editorHideDots").is(':checked')) {
		this.graph.dots.forEach(dot => dot.hide());
	    } else {
		this.graph.dots.forEach(dot => dot.show());
	    }
	})
	new ColorPicker($("#editorBackgroundColorPicker")[0], {
	    change: (color) => {
		this.history.push(new EditorHistoryEvent('setBackgroundColor', {
		    old: this.backgroundColor,
		    new: color
		}));
		this.setBackgroundColor(color);
	    }
	});
	document.addEventListener('keydown', event => {
	    if ( (event.ctrlKey || event.metaKey) && event.key === 'z' ) {
		this.undo();
	    }
	});
    }

    undo() {
	if (this.history.length == 0) { return; }
	const undoEvent = this.history.pop();
	const historyCopy = Array.from(this.history);
	const {action, args} = undoEvent;
	if (action == "addDot") {
	    var dot = this.findDot(args.x, args.y);
	    if (dot) {
		this.removeDot(dot);
	    } else{
		this.undoError("Cound not find dot");
	    }
	} else if (action == "removeDot") {
	    this.addDot(args.x, args.y);
	} else if (action == "moveDot") {
	    var dot = this.findDot(args.destination.x, args.destination.y);
	    if (dot) {
		dot.move(args.source.x, args.source.y);
	    } else{
		this.undoError("Cound not find dot");
	    }
	} else if (action == "addTri") {
	    var tri = this.findTri(args.corners);
	    if (tri) {
		this.removeTri(tri);
	    } else{
		this.undoError("Cound not find tri");
	    }
	} else if (action == "removeTri") {
	    const corners = args.corners.map(p => this.findDot(p.x, p.y));
	    this.addTri(corners, args.color);
	} else if (action == "setBackgroundColor") {
	    this.setBackgroundColor(args.old);
	} else if (action == "setImage") {
	    this.setImage(args.oldImage.path, args.oldImage.image);
	    $("#editorLoadBackground").val('');
	} else if (action == "deleteLevel") {
	    console.log("undo delete -- Loading from json");
	    this.loadFromJson(args.json);
	} else if (action == "loadFromJson") {
	    console.log("undo load -- Loading from json");
	    this.loadFromJson(args.json);
	}
	this.history = historyCopy;
	if (undoEvent.multistep) {
	    // Used when adding a dot causes tri's to be subdivided.
	    this.undo();
	}
    }

    undoError(message) {
	console.log("Undo error", message)
    }

    findDot(x, y) {
	const dot = this.graph.closestDotTo(x, y);
	const EPSILON = 1e-4;
	if (dot && (Math.hypot(x-dot.x, y-dot.y) < EPSILON)) {
	    return dot;
	} else {
	    console.log("Unable to find dot at", [x, y]);
	}
	return null;
    }

    findTri(corners) {
	const dots = corners.map(c => this.findDot(c.x, c.y));
	for (const tri of this.graph.tris) {
	    const dotSet = new Set(dots);
	    tri.corners.forEach(corner => dotSet.add(corner));
	    console.log(dotSet.size);
	    if (dotSet.size == 3) {
		return tri;
	    }
	}
	return null;
    }

    saveLevel(filename) {
	// Get the thumbnail and convert to png.
	const svg = $(this.container).find("svg")[0];
	this.graph.dots.forEach(dot => dot.hide());
	if (this.image) { this.image.opacity(0); }
	svgToPng(svg)
	    .then(pngDataUrl => {
		// Generate json (including thumbnail).
		this.graph.dots.forEach(dot => dot.show());
		if (this.image) { this.image.opacity(this.imageOpacity); }
		this.thumbnailPngDataUrl = pngDataUrl;
		console.log("Saving to " + filename);
		const jsonString = this.saveToJson();
		
		// Download the json file.
		const blob = new Blob([jsonString], { type: 'application/json' });
		const link = document.createElement("a");
		link.href = URL.createObjectURL(blob);
		link.download = filename + '.json';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(link.href);  // clean-up.
	    });
    }

    saveToPng() {
	return this.graph.saveToPng(this.extrasForJson());
    }

    saveToJson() {
	return this.graph.saveToJson(this.extrasForJson());
    }

    extrasForJson() {
	return {
	    imageFilename: this.imageFilename,
	    backgroundColor: this.backgroundColor,
	    title: $("#editorTitle").val(),
	    thumbnail: this.thumbnailPngDataUrl,
	};
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
	const oldLevel = this.saveToJson();
	this.clear();
	const historyCopy = Array.from(this.history);
	const extras = this.graph.loadFromJson(
	    jsonString,
	    (x, y) => this.addDot(x, y),
	    (corners, color) => this.addTri(corners, color));
	if (extras.imageFilename) {
	    this.setImage("backgrounds/"+extras.imageFilename);
	}
	if (extras.backgroundColor) {
	    this.setBackgroundColor(extras.backgroundColor);
	}
	this.updateWarnings();
	this.history = historyCopy;
	this.history.push(new EditorHistoryEvent('loadFromJson', {json: oldLevel}));
    }

    clear() {
	this.selection = [];
	this.graph.clear();
	if (this.image) {
	    this.image.remove();
	    this.imageFilename = null;
	    this.graph.setAlpha(1.0);
	}
    }

    addDot(x, y) {
	const dot = this.graph.addDot(x, y);
	dot.circle.on('mousedown', (e) => { this.mouseHandler.mouseDown(e, dot); });
	dot.text.on('mousedown', (e) => { this.mouseHandler.mouseDown(e, dot); });
	this.history.push(new EditorHistoryEvent('addDot', {x: x, y: y}));
	return dot;
    }

    removeDot(dot) {
	dot.tris.forEach(tri => this.removeTri(tri));
    	this.graph.removeDot(dot);
	this.history.push(new EditorHistoryEvent('removeDot', {x: dot.x, y: dot.y}));
	this.selection = this.selection.filter(obj => obj !== dot);
	this.updateWarnings();
    }

    // Todo: remove color arg here?  We usually override it anyway?
    addTri(corners, color) {
	const tri = this.graph.addTri(corners, color, /*highlight=*/ false);
	tri.polygon.on('mousedown', (e) => { this.mouseHandler.mouseDown(e, tri); });
	this.updateTriColor(tri);
	this.history.push(new EditorHistoryEvent('addTri', {
	    corners: corners.map(c => ({x: c.x, y: c.y})), color: color}));
    }

    removeTri(tri) {
	const cornerPoints = tri.corners.map(c => ({x: c.x, y: c.y}));
	this.history.push(new EditorHistoryEvent('removeTri', {
	    corners: cornerPoints, color: tri.color}));
    	this.graph.removeTri(tri);
	this.updateWarnings();
    }

    click(x, y) {
	const dot = this.addDot(x, y);
	const originalTris = Array.from(this.graph.tris);
	for (const tri of originalTris) {
	    this.bisectIfOnTriEdge(dot, tri);
	}
	this.updateWarnings();
    }

    bisectIfOnTriEdge(dot, tri) {
	const DOT_RADIUS = 7;
	for (let i = 0; i < 3; i++) {
	    const p1 = tri.corners[i];
	    const p2 = tri.corners[(i+1) % 3];
	    const p3 = tri.corners[(i+2) % 3];
	    if (circleIntersectsLine(dot, DOT_RADIUS, p1, p2)) {
		this.removeTri(tri);
		this.addTri([dot, p1, p3], tri.color);
		this.addTri([dot, p2, p3], tri.color);
		this.history.at(-1).multistep = true;
		this.history.at(-2).multistep = true;
		this.history.at(-3).multistep = true;
		return true;
	    }
	}
	return false;
    }

    // Click on triangle: divide it into 2 or 3 triangles.
    clickTri(tri, x, y) {
	const dot = this.addDot(x, y);
	if (this.bisectIfOnTriEdge(dot, tri)) {
	    return;
	} else {
	    const [p1, p2, p3] = tri.corners;
	    this.removeTri(tri);
	    this.addTri([dot, p1, p2], tri.color);
	    this.addTri([dot, p2, p3], tri.color);
	    this.addTri([dot, p1, p3], tri.color);
	    this.history.at(-1).multistep = true;
	    this.history.at(-2).multistep = true;
	    this.history.at(-3).multistep = true;
	    this.history.at(-4).multistep = true;
	}
    }

    clickDot(dot) {
	if (dot.isSelected) {
	    dot.setSelected(false);
	    this.selection = this.selection.filter(obj => obj !== dot);
	} else {
	    this.selection.push(dot);
            dot.setSelected(true);
	    if (this.selection.length == 3) {
		// Clicking 3 dots adds a triangle.
		this.addTri(this.selection, {red: 200, green: 200, blue: 200});
		this.selection.forEach((dot) => dot.setSelected(false));
		this.selection = [];
		this.updateWarnings();
	    }
	}
    }

    rightClickDot(dot) {
	this.removeDot(dot);
    }

    startDragDot(dot, x, y) {
	this.dotDragStartPoint = {x: dot.x, y: dot.y};
	dot.tris.forEach(tri => tri.setAlpha(0.5));
    }

    dragDot(dot, x, y) {
        const point = this.draw.point(x, y);
	dot.move(point.x, point.y);
    }

    endDragDot(dot, x, y) {
	dot.tris.forEach(tri => tri.setAlpha(1));
	dot.tris.forEach(tri => this.updateTriColor(tri));
	if (this.dotDragStartPoint) {
	    this.history.push(new EditorHistoryEvent('moveDot', {
		source: this.dotDragStartPoint,
		destination: {x: dot.x, y: dot.y}
	    }));
	    this.dotDragStartPoint = null;
	}
	this.updateWarnings();
    }

    // Warn about invalid conditions:
    //  * Dot inside a triangle (incl. overlapping tri edges)
    //  * Two triangles overlapping
    updateWarnings() {
	for (const dot of this.graph.dots) {
	    this.clearDotWarning(dot);
	}
	for (const dot of this.graph.dots) {
	    if (this.isDotInAnyTri(dot)) {
		this.showDotWarning(dot);
	    }
	}
	for (const tri1 of this.graph.tris) {
	    for (const tri2 of this.graph.tris) {
		if (tri1 !== tri2) {
		    if (trianglesOverlap(tri1.corners, tri2.corners)) {
			for (const dot of tri1.corners) {
			    this.showDotWarning(dot);
			}
			for (const dot of tri2.corners) {
			    this.showDotWarning(dot);
			}
		    }
		}
	    }
        }
    }

    clearDotWarning(dot) {
	dot.text.hide();
    }

    showDotWarning(dot) {
	dot.setText("\u26A0");
	dot.text.fill("red");
    }

    isDotInAnyTri(dot) {
	const DOT_RADIUS = 7;
	for (const tri of this.graph.tris) {
	    if (tri.corners.some(corner => dot === corner)) {
		continue;
	    }
	    if (isPointInTriangle(dot, tri.corners)) {
		return true;
	    }
	    // Also check for edge overlap (with radius)
	    for (let i = 0; i < 3; i++) {
		const p1 = tri.corners[i];
		const p2 = tri.corners[(i+1) % 3];
		const p3 = tri.corners[(i+2) % 3];
		if (circleIntersectsLine(dot, DOT_RADIUS, p1, p2)) {
		    return true;
		}
	    }
	}
	return false;
    }
    
    rightClickTri(tri) {
	this.removeTri(tri);
    }

    updateTriColors() {
	this.graph.tris.forEach(tri => this.updateTriColor(tri));
    }

    updateTriColor(tri) {
	tri.setColor(this.colorLookupCanvas.getTriColor(tri.corners));
    }

    setImage(path, filename) {
	const oldPath = this.image ? this.image.attr('href') : null;
	this.history.push(new EditorHistoryEvent('setImage', {
	    oldImage: {path: oldPath, filename: this.imageFilename},
	    newImage: {path: path, filename: filename}}));
	this.imageFilename = filename;
	if (this.image !== null) {
	    this.image.remove();
	}
	if (path === null) {
	    this.image = null;
	    this.colorLookupCanvas.clearImage();
	} else {
	    var image = this.draw.image(path);
	    image.node.onerror = function() {
		console.log("Unable to set image");
		image.remove();
	    }
	    this.image = image;
	    image.size(this.width, this.height);
	    image.attr('preserveAspectRatio', 'xMidYMid slice');
	    image.opacity(this.imageOpacity);
	    this.image.insertBefore(this.graph.layerMarkers.image);
	    this.colorLookupCanvas.setImage(path);
	}
    }

    setImageOpacity(opacity) {
	this.imageOpacity = opacity;
	if (this.image) {
	    this.image.opacity(opacity);
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
}

// TODO: move this to a separate file??
class ColorLookupCanvas {
    constructor(width, height, onLoadCallback) {
	this.onLoadCallback = onLoadCallback;
	this.canvas = document.createElement('canvas');
	this.context = this.canvas.getContext('2d');
	this.canvas.width = width;
	this.canvas.height = height;
	this.loaded = false;
    }

    clearImage() {
	this.loaded = false;
    }

    setImage(path) {
	var img = new Image();
	img.src = path
	
	var thisCanvas = this;
	var context = this.context;
	var canvasWidth = this.canvas.width;
	var canvasHeight = this.canvas.height;
	this.loaded = false;

	img.onload = function() {
	    // Position the image so it matches up with
	    // preserveAspectRatio='xMidYMid slice' (which is what
	    // we use for the svg image).
	    var width = img.naturalWidth
	    var height = img.naturalHeight
	    var dx = 0;
	    var dy = 0;
	    if ((width / canvasWidth) > (height / canvasHeight)) {
		width = width * canvasHeight / height;
		height = canvasHeight;
		dx = -(width - canvasWidth) / 2;
		dy = 0;
	    } else {
		height = height * canvasWidth / width;
		width = canvasWidth;
		dx = 0;
		dy = -(height - canvasHeight) / 2;
	    }
	    context.drawImage(img, dx, dy, width, height);
	    thisCanvas.imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
	    thisCanvas.loaded = true;
	    thisCanvas.onLoadCallback();
	};
	img.onerror = function() {
	    console.log("Unable to load image for ColorLookupCanvas");
	}
    }

    getTriColor(corners) {
	if (!this.loaded) {
	    return {red: 128, green: 128, blue: 128};
	}
	var red = 0;
	var green = 0;
	var blue = 0;
	var n = 0;
	const thisCanvas = this;
	iterateTrianglePoints(corners, function(x, y) {
	    var pixel = thisCanvas.getPixel(Math.round(x), Math.round(y));
	    red += pixel.red;
	    green += pixel.green;
	    blue += pixel.blue
	    n += 1
	});
	return {red: Math.round(red / n),
		green: Math.round(green / n),
		blue: Math.round(blue / n)}
    }

    getPixel(x, y) {
	var canvasWidth = this.canvas.width;
	const index = ((y * canvasWidth) + x) * 4;
	const data = this.imageData.data;
	const pixel = {red: data[index],
		       green: data[index + 1],
		       blue: data[index + 2],
		       alpha: data[index + 3]};
	return pixel;
    }
}

