
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

class Confetti {
    constructor(draw, x, y) {
	this.x = x;
	this.y = y;
	this.dy = randomRange(-5, -12);
	this.tilt = randomRange(0, 2*Math.PI);
	this.tiltAngleIncrement = randomRange(-0.3, 0.3);
	this.size = randomRange(5, 10);
	this.color = `hsl(${randomRange(0, 360)}, 100%, 50%)`;
	this.line = draw.line().stroke({ color: this.color, width: this.size / 2 });
    }

    update() {
	this.tilt += this.tiltAngleIncrement;
	this.y += this.dy;
	this.x += Math.sin(this.tilt) * 2;
	this.dy += 0.1;
	const dx = Math.cos(this.tilt) * this.size;
	const dy = Math.sin(this.tilt) * this.size;
	this.line.plot(this.x - dx, this.y - dy, this.x + dx, this.y + dy);
    }

    remove() {
	this.line.remove();
    }
};

function drawConfetti(draw, numConfetti=300) {
    const confetti = [];
    const drawViewbox = draw.viewbox()
    const viewbox = {
	x: Math.min(0, drawViewbox.x),
	y: Math.min(0, drawViewbox.y),
	width: Math.max(draw.width(), drawViewbox.width),
	height: Math.max(draw.height(), drawViewbox.height)
    };
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
	if (animationStep < 300) {
	    requestAnimationFrame(animation);
	} else {
	    confetti.forEach(c => c.remove());
	}
    }
    
    animation();
}

class Firework {
    constructor(draw, x, y, height) {
	this.draw = draw;
	this.x = x;
	this.y = y;
	this.scale = height/1000;
	this.dx = randomRange(-1, 1) * this.scale;
	this.dy = randomRange(-10, -14) * this.scale;
	this.delay = randomRange(0, 50);
	this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
	this.radius = randomRange(1, 4);
	this.exploded = false;
	this.rocket = draw.circle().fill("#865").radius(2).move(this.x, this.y);
	this.particles = []
    }

    update() {
	if (this.delay > 0) {
	    this.delay -= 1;
	    return;
	}
	this.x += this.dx;
	this.y += this.dy;
	this.dy += 0.1 * this.scale;
	if (this.dy > 0 && !this.exploded) {
	    this.explode();
	    this.rocket.remove();
	}
	this.particles.forEach(p => p.update());
	if (!this.exploded) {
	    this.rocket.move(this.x, this.y);
	}
    }

    explode() {
	this.exploded = true;
	for (let i = 0; i < 30; i++) {
	    this.particles.push(new FireworkParticle(this.draw, this.x, this.y, this.scale, this.color));
	}
    }

    remove() {
	this.rocket.remove();
	this.particles.forEach(p => p.remove());
    }
}

class FireworkParticle {
    constructor(draw, x, y, scale, color) {
	this.x = x;
	this.y = y;
	this.color = color;
	this.dx = randomRange(-3,3) * scale;
	this.dy = randomRange(-3,2) * scale;
	this.size = randomRange(1,3) * scale;
	this.alpha = 1;
	this.dot = draw.circle().fill(this.color).radius(this.size);
	this.dot.move(this.x, this.y);
    }

    update() {
	if (this.alpha < 0) {
	    return;
	}
	this.x += this.dx
	this.y += this.dy;
	this.dy += 0.03;
	this.alpha -= 0.01;
	this.dot.move(this.x, this.y);
	if (this.alpha < 0) {
	    this.dot.remove();
	} else {
	    this.dot.opacity(this.alpha);
	}
    }

    remove() {
	this.dot.remove();
    }
}


function drawFireworks(draw, numFireworks=50) {
    const fireworks = [];
    const drawViewbox = draw.viewbox()
    const viewbox = {
	x: Math.min(0, drawViewbox.x),
	y: Math.min(0, drawViewbox.y),
	width: Math.max(draw.width(), drawViewbox.width),
	height: Math.max(draw.height(), drawViewbox.height)
    };
    for (let i = 0; i < numFireworks; i++) {
      fireworks.push(new Firework(
	  draw,
	  viewbox.x + randomRange(0, viewbox.width),
	  viewbox.y + viewbox.height,
	  viewbox.height));
    }
    
    var animationStep = 0;
    function animation() {
	for (let i = 0; i < fireworks.length; i++) {
	    fireworks[i].update();
	}
	animationStep++;
	if (animationStep < 500) {
	    requestAnimationFrame(animation);
	} else {
	    fireworks.forEach(c => c.remove());
	}
    }
    
    animation();
}
