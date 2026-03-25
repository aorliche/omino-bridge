import {$, $$, drawText} from './util.js';
import {Point, dist} from './primitives.js';
import {Edge, automaticallyGrow, createPolyFromPointsAndIntegrate, 
	initNeighbors, markConnectedComponent, makeOminos} from './polys.js';

window.addEventListener('load', e => {
	const canvas = $('#canvas');

	let numLoaded = 0;
	const NUM_TO_LOAD = 10;
	const PLAY_WIDTH = canvas.width-400;
	const EDGE_WIDTH = 50;
	const NUM_GROWS = 200;
	const boards = [];
	let globPolys = [];
	let globEdges = [];
	let ominos = [];
	let hovering = false;

	canvas.addEventListener('mousedown', e => {
		const p = Point(e.offsetX, e.offsetY);
		// Order of drawing should be the same as z order of clicking
		for (let i=ominos.length-1; i >= 0; i--) {
			if (ominos[i].mouseDown(p)) {
				// Bring the omino to the front
				const sav = ominos[i];
				ominos.splice(i, 1);
				ominos.push(sav);
				return;
			}
		}
	});

	canvas.addEventListener('mouseup', e => {
		for (let i=0; i<ominos.length; i++) {
			ominos[i].mouseUp();
		}
		// Hovering over reload button
		const p = Point(e.offsetX, e.offsetY);
		if (p.x > PLAY_WIDTH + 110 && p.x < PLAY_WIDTH + 310 && p.y > 500 && p.y < 580) {
			numLoaded = 0;
			boards = [];
			ominos = [];
		}
	});

	canvas.addEventListener('mouseout', e => {
		for (let i=0; i<ominos.length; i++) {
			ominos[i].mouseUp();
		}
		hovering = false;
		canvas.classList.remove('pointer');
	});

	canvas.addEventListener('mousemove', e => {
		const p = Point(e.offsetX, e.offsetY);
		for (let i=0; i<ominos.length; i++) {
			ominos[i].mouseMove(p);
		}
		// Hovering over reload button
		if (p.x > PLAY_WIDTH + 110 && p.x < PLAY_WIDTH + 310 && p.y > 500 && p.y < 580) {
			hovering = true;
			canvas.classList.add('pointer');
		} else {
			hovering = false;
			canvas.classList.remove('pointer');
		}
	});

	function drawLoading(num, total) {
		const ctx = canvas.getContext('2d');
		const width = 600;
		const height = 80;
		const barWidth = (num/total)*(width-60);
		const barHeight = height-40;

		ctx.strokeStyle = '1px solid black';
		ctx.strokeRect(canvas.width/2-width/2, canvas.height/2-20, width, height);

		drawText(ctx, 
			'Loading...', 
			{x: canvas.width/2-width/2+50, y: canvas.height/2-10, ljust: true},
			'black',
			'42px sans',
			null,
			'white');

		ctx.fillStyle = '#33f';
		ctx.fillRect(canvas.width/2-width/2+30, canvas.height/2+5, barWidth, barHeight);
	}

	let lastts = null;

	function animate(ts) {
		if (lastts === null) {
			lastts = ts;
			repaint();
		} else if (ts - lastts > 1000/30) {
			if (numLoaded < NUM_TO_LOAD) {
				const polys = [];
				const edges = [];
				let failed = false;
				// Primordial edge
				edges.push(new Edge(
					Point(PLAY_WIDTH/2-EDGE_WIDTH/2, canvas.height/2), 
					Point(PLAY_WIDTH/2+EDGE_WIDTH/2, canvas.height/2)));
				// Fixed grow cycles even with backtracking
				for (let i=0; i<NUM_GROWS && !failed; i++) {
					try {
						automaticallyGrow(polys, edges);
					} catch (e) {
						failed = true;
						break;
					}
				}
				boards.push({polys, edges});
				numLoaded++;
				globPolys = [];
			} else if (globPolys.length == 0) {
				// Choose biggest board
				boards.sort((a,b) => a.polys.length < b.polys.length);
				const polys = boards[0].polys;
				// Construct new polys board
				globPolys = [];
				globEdges = [];
				for (let i=0; i<polys.length; i++) {
					// Cull polys with points outside playing area
					let cull = false;
					const points = polys[i].points;
					for (let j=0; j<points.length; j++) {
						const point = points[j];
						if (point.x < 20 
							|| point.x > PLAY_WIDTH-20
							|| point.y < 20
							|| point.y > canvas.height-20) {
							cull = true;
							break;
						}
					}
					if (cull) {
						continue;
					}
					const succ = createPolyFromPointsAndIntegrate(points, null, globPolys, globEdges);
					if (!succ) {
						console.log("Failed copy poly");
						continue;
					}
				}
				// Probabilistic check connectedness
				// We sometimes have it when dodecagons getting culled leaves triangles
				// and squares stranded
				initNeighbors(globEdges);
				markConnectedComponent(globPolys);
				for (let i=0; i<globPolys.length; i++) {
					if (!globPolys[i].marked) {
						// Redo on next frame
						console.log('Disconnected');
						boards.splice(0, 1);
						globPolys = [];
					}
				}
				// Check that we didn't do a disconnected redo in the previous step
				if (globPolys.length > 0) {
					// Make ominos get lots of chance since it's probabilistic
					ominos = [];
					for (let i=0; i<20 && ominos.length == 0; i++) {
						ominos = makeOminos(globPolys);
					}
					// Another retry for failure
					if (ominos.length === 0) {
						boards.splice(0, 1);
						globPolys = [];
					} else {
						// Get the ominos with the greatest distance between them
						let idx1 = 0;
						let idx2 = 1;
						let d = 0;
						for (let i=0; i<ominos.length; i++) {
							// Save center
							ominos[i].save();
							for (let j=i+1; j<ominos.length; j++) {
								const dd = dist(ominos[i].center, ominos[j].center);
								if (dd > d) {
									idx1 = i;
									idx2 = j;
									d = dd;
								}
							}
						}
						ominos[idx1].fixed = true;
						ominos[idx2].fixed = true;
						// Move unfixed ominos into the drag ominos holding area
						for (let i=0; i<ominos.length; i++) {
							if (ominos[i].fixed) {
								continue;
							}
							const c = ominos[i].center;
							const to = Point(
								PLAY_WIDTH + 50 + Math.random()*(canvas.width - PLAY_WIDTH - 100),
								150 + Math.random()*(canvas.height - 300));
							// hacky move
							ominos[i].from = c;
							ominos[i].mouseMove(to);
							ominos[i].from = null;
						}
					}
				}
				console.log('here');
			}
			lastts = ts;
			repaint();
		}
		requestAnimationFrame(animate);
	}

	function repaint() {
		const ctx = canvas.getContext('2d');
		ctx.fillStyle = 'white';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		if (numLoaded < NUM_TO_LOAD) {
			drawLoading(numLoaded, NUM_TO_LOAD);
		} else {
			ctx.strokeStyle = 'black';
			ctx.lineWidth = 1;

			ctx.fillStyle = '#eee';
			ctx.fillRect(PLAY_WIDTH, 0, canvas.width-PLAY_WIDTH, canvas.height);

			ctx.beginPath();
			ctx.moveTo(PLAY_WIDTH, 0);
			ctx.lineTo(PLAY_WIDTH, canvas.height);
			ctx.stroke();
			
			/*for (let i=0; i<globPolys.length; i++) {
				globPolys[i].draw(ctx);
			}*/
			for (let i=0; i<ominos.length; i++) {
				ominos[i].draw(ctx);
			}

			ctx.fillStyle = '#fab';
			ctx.fillRect(PLAY_WIDTH, 0, canvas.width-PLAY_WIDTH, 80);
			ctx.strokeRect(PLAY_WIDTH, 0, canvas.width-PLAY_WIDTH, 80);

			drawText(ctx, 
				'Drag Ominos',
				{x: canvas.width-(canvas.width-PLAY_WIDTH)/2, y: 50},
				'black',
				'42px sans',
				null,
				null);


			// Reload button
			ctx.fillStyle = hovering ? 'white' : '#88f';
			ctx.fillRect(PLAY_WIDTH + 120, 500, 180, 80);
			ctx.lineWidth = 2;
			ctx.strokeStyle = 'black';
			ctx.strokeRect(PLAY_WIDTH + 120, 500, 180, 80);

			drawText(ctx, 
				'Reload', 
				{x: PLAY_WIDTH + 210, y: 555},
				hovering ? '#88f' : 'white',
				'42px sans',
				null,
				null);

			// Victory screen
			let vic = true;
			for (let i=0; i<ominos.length; i++) {
				if (!ominos[i].fixed) {
					vic = false;
					break;
				}
			}
			if (vic) {
				ctx.globalAlpha = 0.2;
				ctx.fillStyle = '#000';
				ctx.fillRect(0, 250, canvas.width, 100);
				ctx.globalAlpha = 1;

				drawText(ctx,
					'Congratulations! You solved it.',
					{x: canvas.width/2, y: 320},
					'white',
					'48px sans',
					true,
					null);
			}
		}
	}

	animate(0);
});
