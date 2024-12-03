
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function Confetti(draw, x, y) {
    this.x = x;
    this.y = y;
    this.i = 0;
    this.dy = randomRange(-5, -12);
    this.tilt = randomRange(0, 2*Math.PI);
    this.tiltAngleIncrement = randomRange(-0.3, 0.3);
    this.size = randomRange(5, 10);
    this.color = `hsl(${randomRange(0, 360)}, 100%, 50%)`;
    this.line = draw.line().stroke({ color: this.color, width: this.size / 2 });
}

Confetti.prototype.update = function() {
    this.i++;
    this.tilt += this.tiltAngleIncrement;
    this.y += this.dy;
    this.x += Math.sin(this.tilt) * 2;
    this.dy += 0.1;
    const dx = Math.cos(this.tilt) * this.size;
    const dy = Math.sin(this.tilt) * this.size;
    this.line.plot(this.x - dx, this.y - dy, this.x + dx, this.y + dy);
};

function drawConfetti(draw, numConfetti=300) {
    const confetti = [];
    const viewbox = draw.viewbox()
    for (let i = 0; i < numConfetti; i++) {
      confetti.push(new Confetti(
	  draw,
	  viewbox.x + randomRange(0, viewbox.width),
	  viewbox.y + randomRange(0, 2*viewbox.height)));
    }
    
    var animationStep = 0;
    function animation() {
	for (let i = 0; i < confetti.length; i++) {
	    confetti[i].update();
	}
	animationStep++;
	if (animationStep < viewbox.height) {
	    requestAnimationFrame(animation);
	} else {
	    for (let i = 0; i < confetti.length; i++) {
		confetti[i].line.remove();
	    }
	}
    }
    
    animation();
}
