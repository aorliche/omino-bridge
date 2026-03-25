export {$, $$, shuffle, drawText};

const $ = q => document.querySelector(q);
const $$ = q => [...document.querySelectorAll(q)];

function shuffle(arr) {
	for (let i=0; i<arr.length; i++) {
		const j = Math.floor(Math.random()*arr.length);
		const temp = arr[i];
		arr[i] = arr[j];
		arr[j] = temp;
	}
}

function drawText(ctx, text, p, color, font, stroke, fill) {
	ctx.save();
	if (font) ctx.font = font;
	const tm = ctx.measureText(text);
	if (fill) {
		ctx.fillStyle = fill;
		ctx.fillRect(p.x, 
			p.y-tm.actualBoundingBoxAscent, 
			tm.width, 
			tm.actualBoundingBoxAscent + tm.actualBoundingBoxDescent);
	}
	ctx.fillStyle = color;
	if (p.ljust) 
		ctx.fillText(text, p.x, p.y);
	else if (p.rjust)
		ctx.fillText(text, p.x-tm.width, p.y);
	else
		ctx.fillText(text, p.x-tm.width/2, p.y);
	if (stroke) {
		ctx.strokeStyle = stroke;
		ctx.lineWidth = 1;
		ctx.strokeText(text, p.x-tm.width/2, p.y);
	}
	ctx.restore();
	return tm;
}

