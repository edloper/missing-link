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
	  <th align="right">Background Color</th>
	  <td>
	    <div id="editorBackgroundColorPicker"></div>
	  </td>
	</tr>
      </table>
`

class LevelEditor {
    constructor(container, width, height) {
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
	this.canvas = new ColorLookupCanvas(width, height, () => this.updateTriColors());
	this.graph.setAlpha(1.0);
	this.thumbnailPngDataUrl = null;
	this.addControls();
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
	new ColorPicker($("#editorBackgroundColorPicker")[0], {
	    change: (color) => {
		this.setBackgroundColor(color);
	    }
	});
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
	this.clear();
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
	return dot;
    }

    addTri(corners, color) {
	const tri = this.graph.addTri(corners, color);
	tri.polygon.on('mousedown', (e) => { this.mouseHandler.mouseDown(e, tri); });
	this.updateTriColor(tri);
    }

    removeTri(tri) {
    	this.graph.removeTri(tri);
    }

    removeDot(dot) {
    	this.graph.removeDot(dot);
	this.selection = this.selection.filter(obj => obj !== dot);
    }

    click(x, y) {
	this.addDot(x, y);
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
		this.addTri(this.selection, {red: 0, green: 0, blue: 0});
		this.selection.forEach((dot) => dot.setSelected(false));
		this.selection = [];
	    }
	}
    }

    rightClickDot(dot) {
	this.removeDot(dot);
    }

    startDragDot(dot, x, y) {
	dot.tris.forEach(tri => tri.setAlpha(0.5));
    }

    dragDot(dot, x, y) {
        const point = this.draw.point(x, y);
	dot.move(point.x, point.y);
    }

    endDragDot(dot, x, y) {
	dot.tris.forEach(tri => tri.setAlpha(1));
	dot.tris.forEach(tri => this.updateTriColor(tri));
    }

    rightClickTri(tri) {
	this.removeTri(tri);
    }

    updateTriColors() {
	this.graph.tris.forEach(tri => this.updateTriColor(tri));
    }

    updateTriColor(tri) {
	var color;
	if (this.canvas.imageData === null) {
	    color = {red: 0, green: 0, blue: 0}
	} else {
	    color = this.canvas.getTriColor(tri.corners);
	}
	tri.setColor(color);
    }

    setImage(path, filename) {
	this.imageFilename = filename;
	if (this.image !== null) {
	    this.image.remove();
	}
	if (path !== null) {
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
	    this.canvas.setImage(path);
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

class ColorLookupCanvas {
    constructor(width, height, onLoadCallback) {
	this.onLoadCallback = onLoadCallback;
	this.canvas = document.createElement('canvas');
	this.context = this.canvas.getContext('2d');
	this.canvas.width = width;
	this.canvas.height = height;
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
	    return {red: 0, green: 0, blue: 0};
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

