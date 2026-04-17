import {sub, Point, add, mul, dist} from './primitives.js';
export {arrange};

// Iterative repulsion for all ominos
// Repulsion from edge should have greatest contribution
function arrange(ominos, minx, maxx, miny, maxy) {
	for (let iter=0; iter<50; iter++) {
		for (let i=0; i<ominos.length; i++) {
			const ci = ominos[i].center;
			let delta = Point(0,0);
			for (let j=0; j<ominos.length; j++) {
				if (i == j) continue;
				const cj = ominos[j].center;
				const dv = mul(sub(ci, cj), 100/dist(ci, cj));
				delta = add(delta, dv);
			}
			if (ci.x < minx) {
				delta = add(delta, Point(5*(minx-ci.x), 0));
			}
			if (ci.x > maxx) {
				delta = add(delta, Point(5*(maxx-ci.x), 0));
			}
			if (ci.y < miny) {
				delta = add(delta, Point(0, 5*(miny-ci.y)));
			}
			if (ci.y > maxy) {
				delta = add(delta, Point(0, 5*(maxy-ci.y)));
			}
			ominos[i].from = ci;
			ominos[i].mouseMove[add(ci, delta)];
			ominos[i].from = null;
		}
	}
}
