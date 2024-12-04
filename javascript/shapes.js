
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
    const d1 = (x - x2) * (y1 - y2) - (x1 - x2) * (y - y2);
    const d2 = (x - x3) * (y2 - y3) - (x2 - x3) * (y - y3);
    const d3 = (x - x1) * (y3 - y1) - (x3 - x1) * (y - y1);
    
    return (
	(d1 >= 0 && d2 >= 0 && d3 >= 0) ||
	    (d1 <= 0 && d2 <= 0 && d3 <= 0)
    );
}

function trianglesOverap(corners1, corners2) {
    const edges = [[0, 1], [1, 2], [2, 3]]

    for (const edge1 of edges) {
	for (const edge2 of edges) {
	    if (linesIntersect(corners1[edge1[0]], corners1[edge1[1]],
		 	       corners2[edge2[0]], corners2[edge2[1]])) {
		return true;
	    }
	}
    }
    return false;
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
    det = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1);
    if (det === 0) {
	return false;
    } else {
	lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
	gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
	return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }
};

function circleIntersectsLine(center, radius, p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = 
	  Math.abs(dy*center.x - dx*center.y + p2.x*p1.y - p2.y*p1.x) /
	  Math.hypot(dx, dy);
    if (distance > radius) {
	return false;
    }
    const [minX, maxX] = (p1.x < p2.x) ? [p1.x, p2.x] : [p2.x, p1.x];
    const [minY, maxY] = (p1.y < p2.y) ? [p1.y, p2.y] : [p2.y, p1.y];
    const inBounds = ((minX - radius/2 <= center.x) && (center.x <= maxX + radius/2) &&
		      (minY - radius/2 <= center.y) && (center.y <= maxY + radius/2));
    return inBounds;
}
