export {$, $$, shuffle};

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
