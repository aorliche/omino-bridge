
import {Point, clonePoint, add, sub, mul, rotate, nearby, nearbyScalar, dist} from './primitives.js';
export {Edge, getNewPolyPointsFromExisting, getNewPolyPointsFromEdge, createPolyFromPointsAndIntegrate
};

function getAngleRemainingAtVertex(newN, p, globEdges) {
	let angle = 0;
	switch (newN) {
		case 3: angle += 60; break;
		case 4: angle += 90; break;
		case 6: angle += 120; break;
		case 12: angle += 150; break;
		default: throw new Error('Bad value for newN in getAngleRemaining'); break;
	}
	const uniqPolys = [];
	for (let i=0; i<globEdges.length; i++) {
		const e = globEdges[i];
		if (nearby(e.points[0], p) || nearby(e.points[1], p)) {
			for (let j=0; j<e.polys.length; j++) {
				const poly = e.polys[j];
				let found = false;
				for (let k=0; k<uniqPolys.length; k++) {
					if (uniqPolys[k] == poly) {
						found = true;
						break;
					}
				}
				if (!found) {
					uniqPolys.push(poly);
				}
			}
		}
	}
	for (let i=0; i<uniqPolys.length; i++) {
		switch (uniqPolys[i].points.length) {
			case 3: angle += 60; break;
			case 4: angle += 90; break;
			case 6: angle += 120; break;
			case 12: angle += 150; break;
			default: throw new Error('Bad value for points length in getAngleRemaining'); break;
		}
	}
	return 360 - angle;
}

function getNewPolyPointsFromExisting(existing, edge, n) {
	const pCW = getNewPolyPointsFromEdge(edge, n, false);
	const pCCW = getNewPolyPointsFromEdge(edge, n, true);
	const c = existing.center;
	const cCW = centerFromPoints(pCW);
	const cCCW = centerFromPoints(pCCW);
	if (dist(c, cCW) < dist(c, cCCW)) {
		return pCCW;
	} else {
		return pCW;
	}
}

function getNewPolyPointsFromEdge(edge, n, ccw) {
	const points = [clonePoint(edge.points[0]), clonePoint(edge.points[1])];
	let theta = Math.PI - (n*Math.PI - 2*Math.PI)/n;
	if (ccw == false) {
		theta = -theta;
	}
	for (let i=0; i<n-1; i++) {
		const dp = sub(points.at(-1), points.at(-2));
		const dpr = rotate(dp, theta);
		const dpn = add(points.at(-1), dpr);
		points.push(dpn);
	}
	if (!nearby(points.at(-1), points[0])) {
		throw new Error("Polygon does not close in on itself");
	}
	points.splice(n, 1);
	return points;
}

function centerFromPoints(points) {
	const n = points.length;
	let center = Point(0,0);
	for (let i=0; i<n; i++) {
		center = add(center, mul(points[i], 1/n));
	}
	return center;
}

function createPolyFromPointsAndIntegrate(points, selEdge, globPolys, globEdges) {
	// Create poly
	const poly = new Polygon({points});
	// Check that all poly points are not inside an existing poly
	for (let i=0; i<points.length; i++) {
		for (let j=0; j<globPolys.length; j++) {
			if (globPolys[j].contains(points[i])) {
				console.log(`Polygon ${globPolys[j].id} contains point`);
				return;
			}
		}
	}
	// Check for compatible angle remaining
	const angleRem0 = getAngleRemainingAtVertex(points.length, selEdge.points[0], globEdges);
	const angleRem1 = getAngleRemainingAtVertex(points.length, selEdge.points[1], globEdges);
	const allowed = [0,60,90,120,150,180,210,240,270,300]; 
	if (!allowed.includes(angleRem0) || !allowed.includes(angleRem1)) {
		console.log(`Incompatible angle remaining ${angleRem0},${angleRem1}`);
		return;
	}
	// Assign edges, creating new ones if necessary
	for (let i=0; i<poly.points.length; i++) {
		const p0 = poly.points[i];
		const p1 = poly.points[(i+1)%poly.points.length];
		const temp = new Edge(p0, p1);
		let found = false;
		for (let j=0; j<globEdges.length; j++) {
			if (temp.equals(globEdges[j])) {
				if (globEdges[j].polys.length >= 2) {
					throw new Error("Edge already has two polygons");
				}
				globEdges[j].polys.push(poly);
				found = true;
				break;
			}
		}
		if (!found) {
			temp.polys.push(poly);
			temp.id = edgeIdCount;
			edgeIdCount++;
			globEdges.push(temp);
		}
	}
	globPolys.push(poly);
}

let edgeIdCount = 1;

class Edge {
	constructor(p0, p1) {
		this.points = [p0, p1];
		this.polys = [];
		this.selected = false;
	}

	click(p) {
		const p0 = this.points[0];
		const p1 = this.points[1];
		for (let t=0; t<1.1; t += 0.2) {
			const x = t*p0.x + (1-t)*p1.x;
			const y = t*p0.y + (1-t)*p1.y;
			if (nearby(Point(x,y), p, 8)) {
				return true;
			}
		}
		return false;
	}

	draw(ctx, highlight) {
		const p0 = this.points[0];
		const p1 = this.points[1];
		if (highlight || this.selected) {
			ctx.save();
			ctx.lineWidth = 3;
			ctx.strokeStyle = 'red';
		}
		ctx.beginPath();
		ctx.moveTo(p0.x, p0.y);
		ctx.lineTo(p1.x, p1.y);
		ctx.stroke();
		if (highlight || this.selected) {
			ctx.restore();
		}
	}

	equals(edge) {
		if (nearby(this.points[0], edge.points[0]) 
			&& nearby(this.points[1], edge.points[1])) {
			return true;
		}
		if (nearby(this.points[1], edge.points[0]) 
			&& nearby(this.points[0], edge.points[1])) {
			return true;
		}
		return false;
	}
}

let polyIdCount = 1;

class Polygon {
	constructor(params) {
		this.points = params.points ?? [];
		if (params.id) {
			this.id = params.id;
		} else {
			this.id = polyIdCount;
			polyIdCount++;
		}
	}

	get center() {
		return centerFromPoints(this.points);
	}

	contains(point) {
		// Corresponding vertices are okay
		for (let i=0; i<this.points.length; i++) {
			if (nearby(point, this.points[i])) {
				return false;
			}
		}
		// Since there is a lot of trouble when a ray passes through a vertex
		// (e.g. hits twice when it should hit once, and the most logical
		// change makes it hit zero times instead of once)
		// We rotate the poly by a random angle about the point being tested
		// Hope that randomness means we have a goes to zero chance of going 
		// through a vertex and a goes to zero chance of having parallel lines
		const theta = Math.random()*Math.PI/2;
		const rotPoints = [];
		for (let i=0; i<this.points.length; i++) {
			const p = rotate(sub(this.points[i], point), theta);
			rotPoints.push(p);
		}
		// Linear ray from point in direction of positive x
		let cross = 0;
		for (let i=0; i<rotPoints.length; i++) {
			const p0 = rotPoints[i];
			const p1 = rotPoints[(i+1)%rotPoints.length];
			const t = (-p1.y) / (p0.y - p1.y);
			if (t < 0 || t > 1) {
				continue;
			}
			const x = t*p0.x + (1-t)*p1.x;
			if (x > 0) {
				cross++;
			}
		}
		if ((cross%2) == 1) {
			return true;
		}
		return false;
	}

	draw(ctx, showPolyId) {
		ctx.beginPath();
		ctx.moveTo(this.points[0].x, this.points[0].y);
		for (let i=0; i<this.points.length; i++) {
			const p = this.points[(i+1)%this.points.length];
			ctx.lineTo(p.x, p.y);
		}
		ctx.stroke();
		const c = this.center;
		ctx.fillText(this.id, c.x-5, c.y+5); 
	}
}
