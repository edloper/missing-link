
const ITERATE_TRIANGLE_STEPS = 10;

// Calls callback(x, y) for each point (x, y) inside the given triangle.
// corners: array[{x: float, y: float]}
// callback: [float, float] => null
function iterateTrianglePoints(corners, callback) {
    // Get triangle bounding box
    const minX = Math.min(...corners.map(corner => corner.x));
    const minY = Math.min(...corners.map(corner => corner.y));
    const maxX = Math.max(...corners.map(corner => corner.x));
    const maxY = Math.max(...corners.map(corner => corner.y));
    const dx = (maxX == minX) ? 1 : (1.0 * (maxX - minX) / ITERATE_TRIANGLE_STEPS);
    const dy = (maxY == minY) ? 1 : (1.0 * (maxY - minY) / ITERATE_TRIANGLE_STEPS);
    
    // Iterate through pixels in the bounding box
    for (let y = minY; y <= maxY; y += dy) {
	for (let x = minX; x <= maxX; x += dx) {
	    // Check if pixel is inside the triangle
	    if (isPointInTriangle({x: x, y: y}, corners)) {
		callback(x, y);
	    }
	}
    }
}

// Returns true p is in the trinagle defined by corners.
// p: {x: float, y: float}
// corners: array[{x: float, y: float}]  (length=3)
function isPointInTriangle(p, corners) {
    const x = p.x;
    const y = p.y
    const x1 = corners[0].x;
    const x2 = corners[1].x;
    const x3 = corners[2].x;
    const y1 = corners[0].y;
    const y2 = corners[1].y;
    const y3 = corners[2].y;
    if ((x2-x1) * (y3-y1) === (y2-y1) * (x3-x1)) { return false; }
    const d1 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2);
    const d2 = (x - x3) * (y2 - y3) - (x2 - x3) * (y - y3);
    const d3 = (x - x1) * (y3 - y1) - (x3 - x1) * (y - y1);
    
    return (
	(d1 >= 0 && d2 >= 0 && d3 >= 0) ||
	    (d1 <= 0 && d2 <= 0 && d3 <= 0)
    );
}

function trianglesOverlap(corners1, corners2) {
    // Separating axes detect containment and identical triangles as well as
    // crossings. Touching at only an edge/corner is allowed.
    for (const corners of [corners1, corners2]) {
	for (let i = 0; i < 3; i++) {
	    const a = corners[i], b = corners[(i+1) % 3];
	    const nx = a.y - b.y, ny = b.x - a.x;
	    const project = points => points.map(p => p.x * nx + p.y * ny);
	    const p1 = project(corners1), p2 = project(corners2);
	    const epsilon = 1e-9 * Math.hypot(nx, ny);
	    if (Math.min(...p1) >= Math.max(...p2) - epsilon ||
		Math.min(...p2) >= Math.max(...p1) - epsilon) {
		return false;
	    }
	}
    }
    return true;
}

// returns true if the line from p1->p2 intersects with p3->p4.
function linesIntersect(p1, p2, p3, p4) {
    const x1 = p1.x;
    const x2 = p2.x;
    const x3 = p3.x;
    const x4 = p4.x;
    const y1 = p1.y;
    const y2 = p2.y;
    const y3 = p3.y;
    const y4 = p4.y;
    var det, gamma, lambda;
    if ((x1 == x3 && y1 == y3 && x2 == x4 && y2 == y4) ||
	(x1 == x4 && y1 == y4 && x2 == x3 && y2 == y3)) {
	// Corner case: line doesn't intersect w/ itself.
	return false; 
    }

    // Due to rounding, triangles that share an edge can sometimes be marked as
    // overlapping unless we use this epsilon to make the line intersection test
    // less strict:
    const epsilon = 1e-3;
    
    det = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1);
    if (det === 0) {
	return false;
    } else {
	lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
	gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
	return ((epsilon < lambda && lambda < 1-epsilon) &&
		(epsilon < gamma && gamma < 1-epsilon));
    }
};

function circleIntersectsLine(center, radius, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const lengthSquared = dx*dx + dy*dy;
    const projection = lengthSquared === 0 ? 0 :
	((center.x-p1.x) * dx + (center.y-p1.y) * dy) / lengthSquared;
    const t = Math.max(0, Math.min(1, projection));
    return Math.hypot(center.x - (p1.x+t*dx), center.y - (p1.y+t*dy)) <= radius;
}
