
class Graph {
    constructor(draw, options = {}) {
	this.draw = draw;
	this.dots = []
	this.tris = []
	this.edges = [];
	this.alpha = 0.5;
	this.clickCircleRadius = options.clickCircleRadius ?? 20;

	// Place each object type before its layerMarker in the stacking order.
	this.layerMarkers = {
	    bottom: draw.rect(0, 0),
	    image: draw.rect(0, 0),
	    tris: draw.rect(0, 0),
	    dotClickCircles: draw.rect(0, 0),
	    edges: draw.rect(0, 0),
	    dots: draw.rect(0, 0),
	    top: draw.rect(0, 0),
	}
    }

    clear() {
	// Tris and edges depend on dots, so get removed automatically.
	this.dots.forEach(dot => this.removeDot(dot));
    }

    addTri(corners, color, highlight = false) {
	var tri = new Tri(this, corners, color, this.alpha, highlight);
	this.tris.push(tri);
	corners.forEach(dot => dot.addTri(tri));
	return tri;
    }

    removeTri(tri) {
	tri.corners.forEach(dot => dot.removeTri(tri));
	this.tris = this.tris.filter(item => item !== tri);
	tri.destroy();
    }

    addDot(x, y) {
	var dot = new Dot(this, x, y);
	this.dots.push(dot);
	return dot;
    }

    removeDot(dot) {
	dot.tris.forEach(tri => this.removeTri(tri));
	dot.edges.forEach(edge => this.removeEdge(edge));
	this.dots = this.dots.filter(item => item !== dot);
	dot.destroy();
    }

    addEdge(start_dot, end_dot=null) {
	const edge = new Edge(this, start_dot, end_dot)
	this.edges.push(edge);
	return edge;
    }

    removeEdge(edge, animate = false) {
	if (edge.start) {
	    edge.start.edges = edge.start.edges.filter(item => item !== edge);
	}
	if (edge.end) {
	    edge.end.edges = edge.end.edges.filter(item => item !== edge);
	}
	this.edges = this.edges.filter(item => item !== edge);
	edge.destroy(animate);
    }

    closestDotTo(x, y) {
	var closestDot = null;
	var closestDistance = Infinity;
	for (const dot of this.dots) {
	    const dx = dot.x - x;
	    const dy = dot.y - y;
	    const distance = Math.sqrt(dx*dx + dy*dy);
	    if (distance < closestDistance) {
		closestDistance = distance;
		closestDot = dot;
	    }
	}
	return closestDot;
    }

    setAlpha(alpha) {
	this.alpha = alpha;
	this.tris.forEach(tri => tri.setAlpha(alpha));
    }

    saveToPng(extras = null) {
	return stringToPNG(this.saveToJson(extras));
    }
    
    saveToJson(extras = null) {
	const width = this.draw.width();
	const height = this.draw.height();
	if (extras === null) {
	    extras = {};
	}
	for (let i = 0; i < this.dots.length; i++) {
	    this.dots[i]._index = i;
	}
	var root = {
	    version: 2,
	    dots: this.dots.map(dot => ({x: dot.x / width, y: dot.y / height})),
	    tris: this.tris.map(
		tri => ({color: tri.color,
			 corners: tri.corners.map(dot => dot._index)})),
	    extras: extras,
	}
	console.log("Saved a level");
	this.dots.forEach(dot => delete dot._index);
	return JSON.stringify(root)
    }
    
    loadFromJson(s, addDot, addTri) {
	const root = JSON.parse(s);
	const version = root.version ?? 1;
	const width = this.draw.width();
	const height = this.draw.height();
	const scale = Math.min(width, height);
	const dx = (width < height) ? 0 : (width-height)/2;
	const dy = (height < width) ? 0 : (height-width)/2;
	console.log(scale, dx, dy);
	console.log("Loaded a level");
	this.clear();
	for (const dot_json of root.dots) {
	    const x = dot_json.x * scale + dx;
	    const y = dot_json.y * scale + dy;
	    const dot = (addDot ?? this.addDot)(x, y);
	}
	for (const tri_json of root.tris) {
	    const corners = tri_json.corners.map(n => this.dots[n]);
	    const tri = (addTri ?? this.addTri)(corners, tri_json.color ?? '#ff0000');
	}
	return root.extras ?? {};
    }
}

class Edge {
    constructor(graph, start, end = null, animate = false) {
	// Implement animate.
	
	// Note: we intentionally don't move the line (and shadow) to the "edges"
	// layer until it is connected (so it will be on top of dots).
	this.graph = graph;
	this.start = start;
	this.end = null;
	
	this.shadow = graph.draw.line(start.x, start.y, start.x, start.y)
	    .stroke({width: 7, color: 'rgba(20,20,20,0.4)'});
	
	this.line = graph.draw.line(start.x, start.y, start.x, start.y)
	    .stroke({width: 3, color: 'yellow',
		     dasharray: '5 5'});
	
	start.edges.push(this);
	if (end) {
	    this.connect(end);
	} else {
	    // No pointer events while dragging the line.
	    this.turnOffPointerEvents();
	}
    }

    turnOnPointerEvents() {
	this.shadow.node.style = "";
	this.line.node.style = "";
    }

    turnOffPointerEvents() {
	this.shadow.node.style = "pointer-events: none";
	this.line.node.style = "pointer-events: none";
    }

    drawTo(x, y) {
	this.line.plot(this.start.x, this.start.y, x, y);
	this.shadow.plot(this.start.x, this.start.y, x, y);
    }

    showIsCorrect(easyMode, isCorrect) {
	if (easyMode) {
	    if (isCorrect) {
		this.shadow.stroke({color: 'rgba(0,255,0,0.6)'});
	    } else {
		this.shadow.stroke({color: 'rgba(255,0,0,0.6)'});
	    }
	} else {
	    this.hideShadow();
	}
    }

    connect(end) {
	this.end = end;
	this.drawTo(end.x, end.y);
	end.edges.push(this);
	this.turnOnPointerEvents();
	this.line.stroke({width: 2, color: 'black', dasharray: ''});;
	this.start.updateEdgeCount();
	this.end.updateEdgeCount();
	this.shadow.insertBefore(this.graph.layerMarkers.edges);
	this.line.insertBefore(this.graph.layerMarkers.edges);
	this.hideShadow();
    }

    hideShadow() {
	// We don't actually hide it, but set it to be transparent.  We do
	// this because we want the line to be thicker, so it's easier to
	// click on.
	this.shadow.stroke({color: 'rgba(0,0,0,0)'});
    }

    destroy(animate = false) {
	this.start.updateEdgeCount();
	if (this.end) {
	    this.end.updateEdgeCount();
	}
	this.shadow.remove();
	if (animate) {
	    this.line.stroke({width: 3, color: 'rgb(255,0,0)'});
	    var alpha = 1;
	    let intervalId = setInterval(()=> {
		this.line.stroke({width: 3, color: 'rgba(255,0,0,'+alpha+')'});
		alpha -= 0.15
		if (alpha <= 0) {
		    clearInterval(intervalId);
		    this.line.remove();
		}
	    }, 50);
	} else {	    
	    this.line.remove();
	}
    }

    flash() {
	this.line.stroke({width: 3, color: 'rgb(0,255,0)'});
	var c = 255;
	let intervalId = setInterval(()=> {
	    this.line.stroke({width: 3, color: 'rgb(0,'+c+',0)'});
	    c -= 30;
	    if (c <= 0) {
		clearInterval(intervalId);
		this.line.stroke({width: 2, color: 'black'});;
	    }
	}, 50);
    }
}

/** One of the dots that should be connected by triangles.
  *
  * Attributes:
  *   * x, y: The location of the dot.
  *   * isSelected: Has it been clicked on?  For the editor, you can select up
  *     to three dots (after which a triangle is created).  In the game, you can
  *     select up to two dots (after which a line is created).
  *   * tris: Neighboring triangles.  In edit mode, these are always visible.  In
  *     game mode, these are only visible after all 3 lines have been added.
  *   * lines: Neighboring lines.  Only used in game mode.  These may or may not
  *     be "correct".
  */
class Dot {
    constructor(graph, x, y) {
	this.graph = graph;
	this.isSelected = false;
	this.tris = []  // Triangles that this dot is a corner for.
	this.edges = []  // Edges connected to this dot.
	this.circle = graph.draw.circle().stroke({width: 2, color: 'black'});
	this.clickCircle = graph.draw.circle();
	this.clickCircle.fill('rgba(0,0,0,0)');
	this.text = graph.draw.plain()
	    .font({anchor: 'middle', 'dominant-baseline': 'central', size: '14'})
	    .fill("white").plain('');
	this.textString = '';
	this.text.node.style = 'user-select: none; pointer-events: none';
	this.circle.node.style = 'user-select: none'
	this.clickCircle.node.style = 'pointer-events: all';
	this.text.hide();
	this.move(x, y);
	this.circle.radius(6);
	this.clickCircle.radius(graph.clickCircleRadius);
	this.setSelected(false);
	this.maxEdges = null;
	this.circle.insertBefore(graph.layerMarkers.dots);
	this.text.insertBefore(graph.layerMarkers.dots);
	this.clickCircle.insertBefore(graph.layerMarkers.dotClickCircles);
    }

    hide() {
	this.text.hide();
	this.circle.hide();
	this.clickCircle.hide();
    }

    show() {
	this.circle.show();
	this.clickCircle.show();
	if (this.textString) {
	    this.text.show();
	}
    }

    removeTri(tri) {
	this.tris = this.tris.filter(item => item !== tri);
    }

    addTri(tri) {
	this.tris.push(tri);
    }

    setMaxEdges(maxEdges) {
	this.maxEdges = maxEdges;
    }

    numEdgesLeft() {
	return this.maxEdges - this.edges.length;
    }

    updateEdgeCount() {
	var n = this.numEdgesLeft();
	
	// Todo: hide if all triangles are visible (not if n==0)?
	this.circle.radius(5 + Math.max(n, 2));
	if (n == 0) {
	    this.hide();
	} else {
	    this.setText(n.toString());
	    this.show();
	}
    }

    setText(s) {
	this.text.show();
	this.text.plain(s);
	this.circle.fill('white');
	this.text.fill('black');
	this.textString = s;
    }

    move(x, y) {
	this.x = x
	this.y = y
	const radius = this.circle.attr('r');
	this.circle.radius(0);
	this.circle.move(x, y);
	this.circle.radius(radius);
	this.clickCircle.radius(0);
	this.clickCircle.move(x, y);
	this.clickCircle.radius(this.graph.clickCircleRadius);
	this.text.amove(x, y);
	this.tris.forEach((tri) => tri.update());
    }

    setSelected(isSelected) {
	this.isSelected = isSelected;
	if (isSelected) {
	    this.circle.fill('red');
	} else {
	    this.circle.fill('white');
	}
    }

    destroy() {
	this.circle.remove();
	this.text.remove();
	this.clickCircle.remove();
	this.circle = null;
    }

    on(eventName, callback) {
	this.circle.on(eventName, callback);
	this.clickCircle.on(eventName, callback);
    }
}

class Tri{
    constructor(graph, corners, color, alpha, highlight = false) {
	this.draw = graph.draw;
	this.color = color;
	this.alpha = alpha;
	this.corners = corners.slice();  // Create a copy.
	this.polygon = graph.draw.polygon();
	this.polygon.stroke({width: 1, color: 'black'});
	this.hidden = false;
	
	this.highlight = highlight;
	this.highlightPoly = graph.draw.polygon().fill('none');
	this.highlightPoly.stroke({width: 3, color: 'rgba(200,50,50,0.5)'});
	this.polygon.insertBefore(graph.layerMarkers.tris);
	this.highlightPoly.insertBefore(graph.layerMarkers.tris);

    	this.update();
	this.updateColor();
    }

    hide() {
	this.hidden = true;
	this.polygon.hide();
    }

    show() {
	this.hidden = false;
	this.polygon.show();
    }

    setAlpha(alpha) {
	this.alpha = alpha;
	this.updateColor();
    }

    setColor(color) {
	this.color = color;
	this.updateColor();
    }

    updateColor() {
	const colorStr = (
	    "rgba(" +
		this.color.red + ", " +
		this.color.green + ", " +
		this.color.blue + ", " +
		this.alpha + ")");
	this.polygon.fill(colorStr);
    }


    update() {
	const corners = this.corners;
	const cornerPoints = corners.map(corner => [corner.x, corner.y]);
	if (this.highlight) {
	    this.highlightPoly.plot(this.getHighlightCorners());
	    this.highlightPoly.show();
	    this.polygon.plot(cornerPoints);
	} else {
	    this.highlightPoly.hide();
	    this.polygon.plot(cornerPoints);
	}
    }

    getHighlightCorners() {
	const corners = this.corners;
	const offset = 3;
	var result = []

	const isOnLeft = function(p1, p2, p3) {
	    const d = (p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x);
	    return d > 0;
	}
	const reverse = isOnLeft(corners[0], corners[1], corners[2]);

	for (let i = 0; i < 3; i++) {
	    const p1 = corners[i];
	    const p2 = corners[(i+1) % 3];
	    const opposite = corners[(i+2) % 3];

	    // Normalized vector from p1->p2.
	    var dx = p1.x - p2.x;
	    var dy = p1.y - p2.y;
	    const length = Math.sqrt(dx*dx + dy*dy);
	    dx = dx / length * offset;
	    dy = dy / length * offset;
	    if (reverse) {
		dx = -dx;
		dy = -dy;
	    }

	    result.push([p1.x + dy , p1.y - dx ]);
	    result.push([p2.x + dy , p2.y - dx ]);
	}
	return result;
    }

    destroy() {
	if (this.polygon) {
	    this.polygon.remove();
	    this.highlightPoly.remove();
	    this.polygon = null;
	}
    }
}




