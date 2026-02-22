
import {$, $$} from './util.js';
import {Point, dist} from './primitives.js';
import {Edge, Polygon, getNewPolyPointsFromEdge, getNewPolyPointsFromExisting, createPolyFromPointsAndIntegrate} from './polys.js';

window.addEventListener('load', e => {
	const canvas = $('#canvas');	
	const ctx = canvas.getContext('2d');
	const h = canvas.height;
	const w = canvas.width;

	const edges = [];
	const polys = [];
	let selEdge = null;

	edges.push(new Edge(Point(w/2-20, h/2), Point(w/2+20, h/2)));

	canvas.addEventListener('click', e => {
		// Unselect
		for (let i=0; i<edges.length; i++) {
			edges[i].selected = false;
		}
		selEdge = null;
		const x = e.offsetX;
		const y = e.offsetY;
		const p = Point(x,y);
		for (let i=0; i<edges.length; i++) {
			if (edges[i].click(p)) {
				edges[i].selected = true;
				selEdge = edges[i];
				break;
			}
		}
	});

	canvas.addEventListener('keydown', e => {
		let n = parseInt(e.key);
		if (!([3, 4, 6, 1].includes(n))) {
			console.log("Unrecognized key code " + e.keyCode);
			return;
		}
		if (n == 1) {
			n = 12;
		}
		if (selEdge && selEdge.polys.length < 2) {
			// This is the first edge
			if (selEdge.polys.length == 0) {
				const points = getNewPolyPointsFromEdge(selEdge, n, false);
				createPolyFromPointsAndIntegrate(points, selEdge, polys, edges);
			// This is constructed from the side of an existing poly
			} else {
				const points = getNewPolyPointsFromExisting(selEdge.polys[0], selEdge, n);
				createPolyFromPointsAndIntegrate(points, selEdge, polys, edges);
			}
		}
	});

	const POLYS_PER_ITER = 10;
	const N_ITER = 25;
	let nIter = 0;

	function getRandomPolyN() {
		const choices = [3, 4, 6, 12];
		return choices[Math.floor(Math.random()*choices.length)];
	}

	function automaticallyGrow(globPolys, globEdges) {
		if (globEdges.length == 1 && globPolys.length == 0) {
			const n = getRandomPolyN();
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
		// If this doesn't work out we try again in outer loop
		const nPoly = globPolys.length;
		const MAX_ITER = 100;
		let iter = 0;
		while (nPoly == globPolys.length) {
			const n = getRandomPolyN();
			try {
				const points = getNewPolyPointsFromExisting(closestEdge.polys[0], closestEdge, n);
				createPolyFromPointsAndIntegrate(points, closestEdge, globPolys, globEdges);
			} catch(err) {}
			if (iter++ >= MAX_ITER) {
				closestEdge.polys.push(new Polygon({points: [0, 0, 0]}));
				break;
			}
		}
	}

	let lastts = null;
	function animate(ts) {
		if (lastts === null) {
			lastts = ts;
			repaint();
		} else if (ts - lastts > 1000/30) {
			if (nIter < N_ITER) {
				for (let i=0; i<POLYS_PER_ITER; i++) {
					automaticallyGrow(polys, edges);
				}
				nIter++;
			}
			lastts = ts;
			repaint();
		}
		requestAnimationFrame(animate);
	}

	function repaint() {
		ctx.clearRect(0, 0, w, h);
		for (let i=0; i<polys.length; i++) {
			polys[i].draw(ctx, true);
		}
		for (let i=0; i<edges.length; i++) {
			edges[i].draw(ctx);
		}
	}

	animate(0);
});
