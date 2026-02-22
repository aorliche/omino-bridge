
export {Point, clonePoint, add, sub, rotate, mul, dot, dist, nearby, nearbyScalar};

function Point(x,y) {
	return {x, y};
}

function clonePoint(p) {
	return Point(p.x, p.y);
}

function add(a, b) {
	return Point(a.x+b.x, a.y+b.y);
}

function sub(a, b) {
	return Point(a.x-b.x, a.y-b.y);
}

function mul(p, a) {
	return Point(p.x*a, p.y*a);
}

function rotate(p, theta) {
	return Point(p.x*Math.cos(theta) - p.y*Math.sin(theta),
		p.x*Math.sin(theta) + p.y*Math.cos(theta));
}

function dot(a, b) {
	return a.x*b.x + a.y*b.y;
}

function dist(a, b) {
	const d = sub(a, b);
	return Math.sqrt(dot(d, d));
}

function nearby(a, b, eps) {
	if (!eps) eps = 1e-4;
	return dist(a, b) < eps;
}

function nearbyScalar(a, b, eps) {
	if (!eps) eps = 1e-4;
	return Math.abs(a-b) < eps;
}
