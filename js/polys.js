
import {shuffle} from './util.js';
import {Point, clonePoint, add, sub, mul, rotate, nearby, nearbyScalar, dist} from './primitives.js';
export {Edge, Polygon, getNewPolyPointsFromExisting, getNewPolyPointsFromEdge, createPolyFromPointsAndIntegrate, cullEdgesAndPolysNearVertex, automaticallyGrow, initNeighbors, markConnectedComponent, makeOminos};

function automaticallyGrow(globPolys, globEdges) {
	if (globEdges.length == 1 && globPolys.length == 0) {
		const ns = [3, 4, 6, 12];
		shuffle(ns);
		const n = ns[0];
		const points = getNewPolyPointsFromEdge(globEdges[0], n, false);
		createPolyFromPointsAndIntegrate(points, globEdges[0], globPolys, globEdges);
		return;
	}
	// Choose closest edge with < 2 polygons on it
	let closestDist = Infinity;
	let closestEdge = null;
	const center = globEdges[0].points[0];
	for (let i=0; i<globEdges.length; i++) {
		const e = globEdges[i];
		if (e.polys.length == 2) {
			continue;
		}
		const d0 = dist(e.points[0], center);
		const d1 = dist(e.points[1], center);
		if (d0 < closestDist) {
			closestDist = d0;
			closestEdge = e;
		}
		if (d1 < closestDist) {
			closestDist = d1;
			closestEdge = e;
		}
	}
	if (closestEdge == null) {
		throw new Error('Null closest edge');
	}
	// We give preference to trying dodecagons since they tend to disappear completely
	// If all polygons were given equal try weights
	// If this value is not just right, we instead get a preponderance of dodecagons
	// If this value is too low (try everything randomly) we get too much backtracking?
	let ns = null;
	if (Math.random() > 0.5) {
		ns = [3, 4, 6, 12];
		shuffle(ns);
	} else {
		ns = [3, 4, 6];
		shuffle(ns);
		ns.splice(0,0,12);
	}
	// If this doesn't work out we try again in outer loop
	let succ = false;
	for (let i=0; i<ns.length; i++) {
		const n = ns[i];
		const points = getNewPolyPointsFromExisting(closestEdge.polys[0], closestEdge, n);
		succ = createPolyFromPointsAndIntegrate(points, closestEdge, globPolys, globEdges);
		if (succ) {
			break;
		}
	}
	// Nothing works here so we backtrack
	if (!succ) {
		cullEdgesAndPolysNearVertex(closestEdge.points[0], globPolys, globEdges);
		cullEdgesAndPolysNearVertex(closestEdge.points[1], globPolys, globEdges);
	}
}

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

function cullEdgesAndPolysNearVertex(p, globPolys, globEdges) {
	const sideLen = dist(globEdges[0].points[0], globEdges[0].points[1]);
	const remEdges = [];
	const remPolys = [];
	const thresh = 1.1*sideLen;
	for (let i=0; i<globEdges.length; i++) {
		const e = globEdges[i];
		// Directly removed edges
		if (dist(e.points[0], p) < thresh || dist(e.points[1], p) < thresh) {
			remEdges.push(e);
			for (let j=0; j<e.polys.length; j++) {
				remPolys.push(e.polys[j]);
			}
		}
	}
	// Removed polygons have effects on their edges
	for (let i=0; i<globEdges.length; i++) {
		const e = globEdges[i];
		const polys = [];
		for (let j=0; j<e.polys.length; j++) {
			if (!remPolys.includes(e.polys[j])) {
				polys.push(e.polys[j]);
			}
		}
		if (polys.length == 0) {
			if (!remEdges.includes(e)) {
				remEdges.push(e);
			}
		} else {
			e.polys = polys;
		}
	}
	// Actually remove edges and polygons
	for (let i=0; i<globEdges.length; i++) {
		if (remEdges.includes(globEdges[i])) {
			globEdges.splice(i, 1);
			i--;
		}
	}
	for (let i=0; i<globPolys.length; i++) {
		if (remPolys.includes(globPolys[i])) {
			globPolys.splice(i, 1);
			i--;
		}
	}
}

function createPolyFromPointsAndIntegrate(points, selEdge, globPolys, globEdges) {
	// Create poly
	const poly = new Polygon({points});
	// Check that all poly points are not inside an existing poly
	for (let i=0; i<points.length; i++) {
		for (let j=0; j<globPolys.length; j++) {
			if (globPolys[j].contains(points[i])) {
				console.log(`Polygon ${globPolys[j].id} contains point`);
				return false;
			}
		}
	}
	// Check for compatible angle remaining
	// When we choose random polys to populate the starting board, we may set selEdge to null
	// Because we already know the tessellation is correct
	if (selEdge != null) {
		const angleRem0 = getAngleRemainingAtVertex(points.length, selEdge.points[0], globEdges);
		const angleRem1 = getAngleRemainingAtVertex(points.length, selEdge.points[1], globEdges);
		const allowed = [0,60,90,120,150,180,210,240,270,300]; 
		if (!allowed.includes(angleRem0)) {
			console.log(`Incompatible angle remaining ${angleRem0}`);
			return false;
		}
		if (!allowed.includes(angleRem1)) {
			console.log(`Incompatible angle remaining ${angleRem1}`);
			return false;
		}
	}
	// Assign edges, creating new ones if necessary
	for (let i=0; i<poly.points.length; i++) {
		const p0 = poly.points[i];
		const p1 = poly.points[(i+1)%poly.points.length];
		const temp = new Edge(p0, p1);
		let found = false;
		// We sometimes reach edge already has two polygons here
		// If we do, remove that edge and its polys
		for (let j=0; j<globEdges.length; j++) {
			if (temp.equals(globEdges[j])) {
				if (globEdges[j].polys.length >= 2) {
					//console.log(globEdges[j]);
					console.log("Edge already has two polygons");
					cullEdgesAndPolysNearVertex(globEdges[j].points[0], globPolys, globEdges);
					return false;
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
	return true;
}

function getRandomHex() {
	const digits = ['9','a','b','c','d','e','f'];
	return digits[Math.floor(Math.random()*digits.length)];
}

function getRandomFill() {
	return '#' + getRandomHex() + getRandomHex() + getRandomHex();
}

function getPointsOnLine(pStart, pEnd, nPoints) {
	const points = [];
	for (let i=0; i<nPoints; i++) {
		const t = i/(nPoints-1);
		const p = add(mul(pStart, t), mul(pEnd, 1-t));
		points.push(p);
	}
	return points;
}

/*function getStartAndEndPolys(globPolys, width, height, PAD) {
	const line0 = getPointsOnLine(Point(PAD,PAD), Point(PAD, height-PAD), 10);
	const line1 = getPointsOnLine(Point(PAD, height-PAD), Point(width-PAD, height-PAD), 10);
	const line2 = getPointsOnLine(Point(width-PAD, height-PAD), Point(width-PAD, PAD), 10);
	const line3 = getPointsOnLine(Point(width-PAD, PAD), Point(PAD, PAD), 10);
	const lines = line0.concat(line1).concat(line2).concat(line3);
	const startP = lines[Math.floor(Math.random()*lines.length)];
	// Get 80% of the distance from startP to the most distant point
	const dists = [];
	for (let i=0; i<lines.length; i++) {
		const d = dist(startP, lines[i]);
		dists.push({d, p: lines[i]});
	}
	dists.sort((a, b) => a.d < b.d);
	const longDists = dists.slice(0, Math.floor(0.2*dists.length));
	const endP = longDists[Math.floor(Math.random()*longDists.length)].p;
	// Convert to polygons
	let startPoly = null;
	let endPoly = null;
	for (let i=0; i<globPolys.length; i++) {
		if (globPolys[i].contains(startP)) {
			startPoly = globPolys[i];
		}
		if (globPolys[i].contains(endP)) {
			endPoly = globPolys[i];
		}
		if (startPoly != null && endPoly != null) {
			break;
		}
	}
	return [startPoly, endPoly];
}*/

// Assuming we have two or more non-adjacent polys and we want to fill in edges from them
/*function getEdgesFromPolys(globPolys) {
	const edges = [];
	for (let i=0; i<globPolys.length; i++) {
		const points = globPolys[i].points;
		for (let j=0; j<points.length; j++) {
			const p0 = points[j];
			const p1 = points[(j+1)%points.length];
			edges.push(new Edge(p0, p1));
			edges.at(-1).polys.push(globPolys[i]);
		}
	}
	return edges;
}*/

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
		this.fillStyle = getRandomFill();
		// Built later on in init process see initNeighbors
		this.neighbors = [];
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

	// Fixed is true when the poly is in the correct place and so the edges are highlighted
	draw(ctx, showPolyId, fixed) {
		ctx.beginPath();
		ctx.moveTo(this.points[0].x, this.points[0].y);
		for (let i=0; i<this.points.length; i++) {
			const p = this.points[(i+1)%this.points.length];
			ctx.lineTo(p.x, p.y);
		}
		ctx.fillStyle = this.fillStyle;
		ctx.fill();
		if (fixed) {
			ctx.lineWidth = 2;
			ctx.strokeStyle = 'black';
		} else {
			ctx.lineWidth = 1;
			ctx.strokeStyle = '#555';
		}
		ctx.stroke();
		if (showPolyId) {
			const c = this.center;
			ctx.fillText(this.id, c.x-5, c.y+5); 
		}
	}
}

// Create links from each poly to its neighbors
function initNeighbors(edges) {
	for (let i=0; i<edges.length; i++) {
		const p1 = edges[i].polys[0];
		const p2 = edges[i].polys[1];
		if (!p2) continue;
		// Not sure if this can ever happen...
		if (!p1.neighbors.includes(p2)) p1.neighbors.push(p2);
		if (!p2.neighbors.includes(p1)) p2.neighbors.push(p1);
	}
}

// Requires initNeighbors to have been run
function markConnectedComponent(polys) {
	// Mark all not visited
	for (let i=0; i<polys.length; i++) {
		polys[i].marked = false;
	}
	polys[0].marked = true;
	let frontier = [polys[0]];
	while (frontier.length > 0) {
		const newFrontier = [];
		for (let i=0; i<frontier.length; i++) {
			const poly = frontier[i];
			for (let j=0; j<poly.neighbors.length; j++) {
				const otherPoly = poly.neighbors[j];
				if (otherPoly.marked) {
					continue;
				}
				otherPoly.marked = true;
				newFrontier.push(otherPoly);
			}
		}
		frontier = newFrontier;
	}
}

// Requires initNeighbors to have been run
function makeOminos(polys) {
	const nOminos = Math.floor(polys.length / 5);
	const ominos = [];
	const shuffledPolys = polys.slice();
	shuffle(shuffledPolys);
	for (let i=0; i<nOminos; i++) {
		ominos.push(new Omino(shuffledPolys[i]));
	}
	const polys2 = shuffledPolys.slice(nOminos);
	// Should never happen
	let iterLeft = 20;
	while (polys2.length > 0 && iterLeft > 0) {
		for (let i=0; i<ominos.length; i++) {
			for (let j=0; j<polys2.length; j++) {
				if (ominos[i].connected(polys2[j])) {
					ominos[i].add(polys2[j]);
					polys2.splice(j, 1);
					break;
				}
			}
		}
		iterLeft--;
	}
	// Each omino should have at least three polygons
	for (let i=0; i<ominos.length; i++) {
		if (ominos[i].polys.length < 3) {
			return [];
		}
	}
	return ominos;
}

class Omino {
	constructor(poly) {
		this.polys = [poly];
		this.fillStyle = getRandomFill();
		poly.fillStyle = this.fillStyle;
	}

	add(poly) {
		this.polys.push(poly);
		poly.fillStyle = this.fillStyle;
	}

	get center() {
		let c = Point(0,0);
		for (let i=0; i<this.polys.length; i++) {
			c = add(c, mul(this.polys[i].center, 1/this.polys.length));
		}
		return c;
	}

	connected(poly) {
		for (let i=0; i<this.polys.length; i++) {
			const mine = this.polys[i];
			if (poly.neighbors.includes(mine)) {
				return true;
			}
		}
		return false;
	}

	contains(p) {
		for (let i=0; i<this.polys.length; i++) {
			if (this.polys[i].contains(p)) {
				return true;
			}
		}
		return false;
	}

	draw(ctx) {
		for (let i=0; i<this.polys.length; i++) {
			this.polys[i].draw(ctx, null, this.fixed);
		}
	}

	mouseDown(p) {
		if (this.contains(p)) {
			this.from = p;
			return true;
		}
		return false;
	}

	mouseUp() {
		this.from = null;
	}

	mouseMove(p) {
		if (this.fixed || !this.from) {
			return;
		}
		const delta = sub(p, this.from);
		for (let i=0; i<this.polys.length; i++) {
			const poly = this.polys[i];
			for (let j=0; j<poly.points.length; j++) {
				poly.points[j] = add(delta, poly.points[j]);
			}
		}
		// Check solved and snap into place
		if (nearby(this.savedCenter, this.center, 5)) {
			const delta = sub(this.savedCenter, this.center);
			for (let i=0; i<this.polys.length; i++) {
				const poly = this.polys[i];
				for (let j=0; j<poly.points.length; j++) {
					poly.points[j] = add(delta, poly.points[j]);
				}
			}
			this.fixed = true;
		}
		this.from = p;
	}

	save() {
		this.savedCenter = this.center;
	}
}

/*function connected(p1, p2, polys) {
	if (p1 == p2) {
		return true;
	}
	// Mark not visited
	for (let i=0; i<polys.length; i++) {
		polys[i].visited = false;
	}
	p1.visited = true;
	let frontier = [p1];
	while (frontier.length > 0) {
		const newFrontier = [];
		for (let i=0; i<frontier.length; i++) {
			const poly = frontier[i];
			for (let j=0; j<poly.neighbors.length; j++) {
				const otherPoly = poly.neighbors[j];
				if (otherPoly.visited) {
					continue;
				}
				if (otherPoly == p2) {
					return true;
				}
				otherPoly.visited = true;
				newFrontier.push(otherPoly);
			}
		}
		frontier = newFrontier;
	}
	return false;
}*/
