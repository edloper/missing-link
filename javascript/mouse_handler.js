const DRAG_MIN_TIME = 200;  // msec
const DRAG_MIN_PIXELS = 6;
const MAX_ZOOM_LEVEL = 20;

class MouseHandler {
    constructor(game) {
	this.game = game
	this.clickStartTime = null;  // When did the user start clicking
	this.clickPoint = null;  // Where did they start clicking?
	this.clickObj = null;    // What did the user click on?
	this.zoomLevel = 1;
	this.viewOffset = {x: 0, y: 0};

	this.state = null;
	// Possible values for this.state:
	this.DRAGGING = 'dragging';
	this.CLICKING = 'clicking';
	this.PINCHING = 'pinching';

	this.game.draw.on('mousedown', (e) => this.mouseDown(e));
	this.game.draw.on('wheel', (e) => this.mouseWheel(e));
	this.game.draw.on('contextmenu', (e) => e.preventDefault());
	document.addEventListener('mousemove', (e) => this.mouseMove(e));
	document.addEventListener('mouseup', (e) => this.mouseUp(e));
	document.addEventListener('touchmove', (e) => this.touchMove(e));
	document.addEventListener('touchend', (e) => this.touchEnd(e));

	this.game.draw.on('touchstart', (e) => this.touchStart(e));
	
	this.updateViewbox();
    }

    //==================================================================
    // Mouse handlers

    mouseDown(e, obj=null) {
	e.preventDefault();
	e.stopPropagation();
	if (!this.state) {
	    this.state = this.CLICKING;
	    this.startClick(e.clientX, e.clientY, obj);
	}
    }
    
    mouseMove(e) {
	if (!this.state) { return; }
	e.preventDefault();
	this.move(e.clientX, e.clientY, e.button);
    }

    mouseUp(e) {
	if (!this.state) { return; }
	e.preventDefault();
	this.endClick(e.clientX, e.clientY, e.button);
	this.state = null;
    }

    //==================================================================
    // Touch handlers

    touchStart(e, obj=null) {
	e.preventDefault();
	e.stopPropagation();
	
	if (e.touches.length == 1) {
	    const touch = e.touches[0];
	    this.state = this.CLICKING;
	    this.startClick(touch.clientX, touch.clientY, obj);
	} else if (e.touches.length == 2) {
	    if (this.state == this.DRAGGING) {
		if (this.game.cancelDrag) { this.game.cancelDrag(); }
	    }
	    this.state = this.PINCHING;
	    this.pinchStart(e.touches);
	}
    }

    touchMove(e) {
	if (this.state == this.PINCHING) {
	    this.pinchMove(e.touches);
	} else if (this.state) {
	    const touch = e.targetTouches[0];
	    this.move(touch.clientX, touch.clientY);
	}
    }

    touchEnd(e) {
	if (this.state == this.PINCHING) {
	    e.preventDefault();
	} else if (this.state) {
	    e.preventDefault();
	    const touch = e.changedTouches[0];
	    this.endClick(touch.clientX, touch.clientY);
	}
	this.state = null;
    }

    //==================================================================
    // Pinch handling

    pinchStart(touches) {
	this.lastPinchInfo = this.getPinchInfo(touches);
    }

    pinchMove(touches) {
	if (touches.length != 2) {
	    this.state = null;  // Cancel pinch-to-zoom if >2 touches.
	    return;
	}
	const pinchInfo = this.getPinchInfo(touches);
	const dx = pinchInfo.center.x - this.lastPinchInfo.center.x;
	const dy = pinchInfo.center.y - this.lastPinchInfo.center.y;
	const zoomFactor = pinchInfo.distance / this.lastPinchInfo.distance;
	this.moveViewport(dx, dy);
	this.zoomViewport(pinchInfo.center, zoomFactor);
	// Need to compute pinch info again after shifting viewport.
	this.lastPinchInfo = this.getPinchInfo(touches);
    }
    
    getPinchInfo(touches) {
	const points = [
	    this.game.draw.point(touches[0].clientX, touches[0].clientY),
	    this.game.draw.point(touches[1].clientX, touches[1].clientY)];
	const distance = Math.hypot(touches[0].pageX - touches[1].pageX,
				    touches[0].pageY - touches[1].pageY);
	const center = {x: (points[0].x + points[1].x)/2,
			y: (points[0].y + points[1].y)/2}
	return {center: center, distance: Math.max(distance, 1)}
    }

    //==================================================================
    // Generic touch/mouse handlers

    startClick(x, y, obj=null) {
	this.clickObj = obj;
	this.clickStartTime = performance.now();
	this.clickPoint = this.game.draw.point(x, y);
	this.clickPos = {x: x, y: y};
	this.clickViewOffset = {x: this.viewOffset.x, y: this.viewOffset.y}
	if (obj instanceof Dot) {
	    this.clickStartPos = {x: obj.x, y: obj.y};
	}
    }

    move(x, y, button = 0) {
        const point = this.game.draw.point(x, y);
	if (this.state != this.DRAGGING) {
	    const now = performance.now();
	    if (((now - this.clickStartTime) < DRAG_MIN_TIME) &&
		(Math.abs(this.clickPoint.x - point.x) < DRAG_MIN_PIXELS / this.zoomLevel) &&
		(Math.abs(this.clickPoint.y - point.y) < DRAG_MIN_PIXELS / this.zoomLevel)) {
		return;  // Minimum threshold for "dragging"
	    }
	    if (button == 0) {
		if (this.game.startDragDot && this.clickObj instanceof Dot) {
		    this.game.startDragDot(this.clickObj, point.x, point.y);
		}
	    }
	    this.state = this.DRAGGING;
	}
	if (this.game.dragDot && this.clickObj instanceof Dot) {
	    this.game.dragDot(this.clickObj, x, y);
	} else {
	    // Drag the canvas.
	    var dx = (x - this.clickPos.x) / this.zoomLevel;
	    var dy = (y - this.clickPos.y) / this.zoomLevel;
	    this.moveViewport(dx, dy)
	}
    }

    endClick(x, y, button = 0) {
        const point = this.game.draw.point(x, y);
	if (this.state == this.DRAGGING) {
	    if (button == 0) {
		if (this.game.endDragDot && this.clickObj instanceof Dot) {
		    this.game.endDragDot(this.clickObj, point.x, point.y);
		}
	    }
	} else {
	    if (button == 0) {
		if (this.game.clickDot && this.clickObj instanceof Dot) {
		    this.game.clickDot(this.clickObj);
		}
		else if (this.game.clickTri && this.clickObj instanceof Tri) {
		    this.game.clickTri(this.clickObj);
		}
		else if (this.game.clickEdge && this.clickObj instanceof Edge) {
		    this.game.clickEdge(this.clickObj);
		}
		else if (this.game.click) {
		    this.game.click(point.x, point.y);
		}
	    } else if (button == 2) {
		if (this.game.rightClickDot && this.clickObj instanceof Dot) {
		    this.game.rightClickDot(this.clickObj);
		}
		if (this.game.rightClickTri && this.clickObj instanceof Tri) {
		    this.game.rightClickTri(this.clickObj);
		} else if (this.game.rightClick) {
		    this.game.rightClick(point.x, point.y)
		}
	    }
	}
	this.clickObj = null;
	this.state = null;
    }

    zoomOut() {
	this.viewOffset.x = 0;
	this.viewOffset.y = 0;
	this.zoomLevel = 1.0;
	this.updateViewbox();
    }
    
    mouseWheel(e) {
	e.preventDefault(); // Don't scroll page.
        const point = this.game.draw.point(e.clientX, e.clientY);
	var zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
	this.zoomViewport(point, zoomFactor);
    }

    moveViewport(dx, dy) {
	this.viewOffset.x = this.clickViewOffset.x - dx;
	this.viewOffset.y = this.clickViewOffset.y - dy;
	this.viewOffset.x = Math.max(0, this.viewOffset.x);
	this.viewOffset.y = Math.max(0, this.viewOffset.y);
	this.viewOffset.x = Math.min(this.viewOffset.x,
				     this.game.width * (1 - 1/this.zoomLevel));
	this.viewOffset.y = Math.min(this.viewOffset.y,
				     this.game.height * (1 - 1/this.zoomLevel));
	this.updateViewbox();
    }

    zoomViewport(point, zoomFactor) {
	// Don't zoom out past 100%.
	if ((this.zoomLevel * zoomFactor) <= 1) {
	    zoomFactor = 1/this.zoomLevel;
	}
	if ((this.zoomLevel * zoomFactor) >= MAX_ZOOM_LEVEL) {
	    zoomFactor = MAX_ZOOM_LEVEL/this.zoomLevel
	}
	// Zoom in/out, keeping the mouse at the same canvas position.
	this.viewOffset.x += (point.x - this.viewOffset.x) * (1 - 1/zoomFactor);
	this.viewOffset.y += (point.y - this.viewOffset.y) * (1 - 1/zoomFactor);
	// Don't view outside the original viewport.
        this.viewOffset.x = Math.max(this.viewOffset.x, 0);
        this.viewOffset.y = Math.max(this.viewOffset.y, 0);
	this.viewOffset.x = Math.min(this.viewOffset.x,
				     this.game.width * (1 - 1/this.zoomLevel));
	this.viewOffset.y = Math.min(this.viewOffset.y,
				     this.game.height * (1 - 1/this.zoomLevel));
	// Update zoom level
	this.zoomLevel *= zoomFactor;
	this.updateViewbox();
    }

    updateViewbox() {
	var width = this.game.width;
	var height = this.game.height;
	this.game.draw.viewbox(
	    this.viewOffset.x, this.viewOffset.y,
	    width / this.zoomLevel, height / this.zoomLevel); 
    }
}

