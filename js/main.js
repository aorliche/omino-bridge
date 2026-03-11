
import {$, $$} from './util.js';
import {Point, dist} from './primitives.js';
import {Edge, Polygon, getNewPolyPointsFromEdge, getNewPolyPointsFromExisting, createPolyFromPointsAndIntegrate, automaticallyGrow} from './polys.js';

window.addEventListener('load', e => {
	const canvas = $('#canvas');	
	const ctx = canvas.getContext('2d');
	const h = canvas.height;
	const w = canvas.width;

	let edges = [];
	let polys = [];
	let selEdge = null;

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
		// We may have clicked inside a polygon: delete it
		if (selEdge == null) {
			for (let i=0; i<polys.length; i++) {
				const poly = polys[i];
				// Delete poly and fix up edges
				if (poly.contains(p)) {
					polys.splice(i,1);
					for (let j=0; j<edges.length; j++) {
						for (let k=0; k<edges[j].polys.length; k++) {
							if (edges[j].polys[k] == poly) {
								edges[j].polys.splice(k,1);
								k--;
							}
							if (edges[j].polys.length == 0) {
								edges.splice(j,1);
								j--;
							}
						}
					}
					break;
				}
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

	$('#new').addEventListener('click', e => {
		e.preventDefault();
		initialized = false;
		nFrame = 0;
		nGrow = 0;
		boards = [];
	});

	[3, 4, 6, 1].forEach(key => {
		$('#k' + key).addEventListener('click', e => {
			e.preventDefault();
			const keydown = new KeyboardEvent('keydown', {key});
			canvas.dispatchEvent(keydown);
		});
	});

	// Try to create n tessellations, then choose the largest one
	// Do this in an animation on the board
	const N_GROWINGS = 5;
	const N_ITER_PER_FRAME = 100;
	const N_FRAMES = 15;
	const N_START_POLYS = 50;
	let boards = [];
	let nFrame = 0;
	let nGrow = 0;
	let initialized = false;

	let lastts = null;
	function animate(ts) {
		if (lastts === null) {
			lastts = ts;
			repaint();
		} else if (ts - lastts > 1000/30) {
			if (boards.length < N_GROWINGS) {
				if (nFrame == 0) {
					polys = [];
					edges = [];
					// Primordial edge
					edges.push(new Edge(Point(w/2-20, h/2), Point(w/2+20, h/2)));
				}
				if (nFrame < N_FRAMES) {
					let failed = false;
					for (let i=0; i<N_ITER_PER_FRAME; i++) {
						try {
							automaticallyGrow(polys, edges);
						} catch (e) {
							failed = true;
							break;
						}
					}
					if (failed) {
						nFrame = 0;
					} else {
						nFrame++;
					}
				}
				if (nFrame == N_FRAMES) {
					boards.push({polys, edges});
					nFrame = 0;
				}
			} else if (!initialized) {
				boards.sort((a,b) => a.polys.length < b.polys.length);
				// Get a random subset of polys
				const initPolys = boards[0].polys;
				const ids = [];
				polys = [];
				edges = [];
				let i = 0;
				while (polys.length < N_START_POLYS) {
					const poly = initPolys[Math.floor(Math.random()*initPolys.length)];
					if (ids.includes(poly.id)) {
						continue;
					}
					const center = poly.center;
					if (center.x < 100 
						|| center.x > canvas.width-100
						|| center.y < 100
						|| center.y > canvas.height-100) {
						continue;
					}
					const succ = createPolyFromPointsAndIntegrate(poly.points, null, polys, edges);
					if (!succ) {
						continue;
					}
					polys.at(-1).id = poly.id;
					ids.push(poly.id);
					// Safety
					if (i++ >= 100) {
						break;
					}
				}
				initialized = true;
			}
			lastts = ts;
			repaint();
		}
		requestAnimationFrame(animate);
	}

	function repaint() {
		ctx.clearRect(0, 0, w, h);
		for (let i=0; i<polys.length; i++) {
			polys[i].draw(ctx, false);
		}
		if (selEdge) {
			ctx.strokeStyle = 'red';
			selEdge.draw(ctx);
			ctx.strokeStyle = 'black';
		}
	}

	animate(0);
});
