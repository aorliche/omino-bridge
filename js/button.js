
export {Rect, Button};

class Rect {
	constructor(x, y, w, h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
	}

	contains(p) {
		if (p.x >= this.x 
			&& p.x <= (this.x+this.w) 
			&& p.y >= this.y 
			&& p.y <= (this.y+this.h)) {
			return true;
		}
		return false;
	}
}

class Button {
	constructor(params) {
		this.text = params.text;
		this.center = params.center;
		this.font = params.font;
		this.color = params.color;
		this.padding = params.padding;
		this.clickFn = params.clickFn;
		this.hoverFn = params.hoverFn;
		this.stopHoverFn = params.stopHoverFn;
		const ctx = params.ctx;
		this.hover = false;
		ctx.save();
		ctx.font = this.font;
		this.tm = ctx.measureText(this.text);
		this.topLeft = {
			x: this.center.x-this.tm.width/2-this.padding, 
			y: this.center.y-this.tm.actualBoundingBoxAscent-this.padding};
		this.rect = new Rect(
			this.topLeft.x, 
			this.topLeft.y, 
			this.tm.width+2*this.padding, 
			this.tm.actualBoundingBoxAscent+this.tm.actualBoundingBoxDescent+2*this.padding);
		ctx.restore();
	}

	click(p) {
		if (this.rect.contains(p) && this.clickFn) {
			this.clickFn();
		}
	}

	draw(ctx) {
		ctx.save();
		ctx.font = this.font;
		if (this.hover) {
			ctx.fillStyle = this.color;
			ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
			ctx.fillStyle = 'white';
			ctx.fillRect(this.rect.x+2, this.rect.y+2, this.rect.w-4, this.rect.h-4);
			ctx.fillStyle = this.color;
			ctx.fillText(this.text, 
				this.rect.x+this.padding, 
				this.rect.y+this.tm.actualBoundingBoxAscent+this.padding);
		}  else {
			ctx.fillStyle = this.color;
			ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
			ctx.fillStyle = 'white';
			ctx.fillText(this.text, 
				this.rect.x+this.padding, 
				this.rect.y+this.tm.actualBoundingBoxAscent+this.padding);
		}
		ctx.restore();
	}

	mouseMove(p) {
		if (this.rect.contains(p)) {
			this.hover = true;
			if (this.hoverFn) {
				this.hoverFn();
			}
		} else {
			this.hover = false;
			if (this.stopHoverFn) {
				this.stopHoverFn();
			}
		}
	}

	mouseOut() {
		this.hover = false;
		if (this.stopHoverFn) {
			this.stopHoverFn();
		}
	}
}
