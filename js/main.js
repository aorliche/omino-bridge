
import {$, $$} from './util.js';
import {Point} from './primitives.js';
import {Edge, getNewPolyPointsFromEdge, getNewPolyPointsFromExisting, createPolyFromPointsAndIntegrate} from './polys.js';

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

	let lastts = null;
	function animate(ts) {
		if (lastts === null) {
			lastts = ts;
			repaint();
		} else if (ts - lastts > 1000/30) {
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
