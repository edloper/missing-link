
class ColorPicker {
    constructor(container, options = null) {
	options = options ?? {};
	this.callback = options.change ?? (color => null);
	this.container = container
	this.h = 180;
	this.s = 50;
	this.l = 90;
	
	const table = $("<table class='colorPicker'><tr>"+
			"<td><div class='cpSwatch' /></td>" +
			"<td><div class='cpLight' /></td>" +
			"<td><div class='cpHue' /></td>" +
			"<td><div class='cpSat' /></td>" +
			"</tr></table>");
	this.$container = $(container);
	this.$container.append(table);
	this.$cpSwatch = this.$container.find(".cpSwatch");
	this.$cpHue = this.$container.find(".cpHue");
	this.$cpSat = this.$container.find(".cpSat");
	this.$cpLight = this.$container.find(".cpLight");

	const thisColorPicker = this;
	
	this.$cpLight.slider({
	    orientation: "vertical",
	    min: 0, max: 100, value: this.l,
	    change: function(event, ui) {
		thisColorPicker.l = ui.value;
		thisColorPicker.update();
	    }
	});
	this.$cpHue.slider({
	    orientation: "vertical",
	    min: 0, max: 360, value: this.h,
	    change: function(event, ui) {
		thisColorPicker.h = ui.value;
		thisColorPicker.update();
	    }
	});
	this.$cpSat.slider({
	    orientation: "vertical",
	    min: 0, max: 100, value: this.s,
	    change: function(event, ui) {
		thisColorPicker.s = ui.value;
		thisColorPicker.update();
	    }
	});
	this.update();
    }

    setColor(hsl) {
	this.h = hsl.h;
	this.s = hsl.s;
	this.l = hsl.l;
	this.update();
    }
    
    update() {
	const swatchColor = this.swatchColor();
	this.$cpSwatch.css({"background-color": swatchColor});
	this.$cpHue.css({"background-image": this.hueGradient()});
	this.$cpSat.css({"background-image": this.satGradient()});
	this.$cpLight.css({"background-image": this.lightGradient()});
	this.callback({h: this.h, s: this.s, l: this.l});
	this.$container.find(".ui-slider-handle").css({
	    "background-color": swatchColor,
	});
    }

    swatchColor() {
	return "hsl("+this.h+","+this.s+"%,"+this.l+"%)";
    }

    hueGradient() {
	const hues = [0, 60, 120, 180, 240, 300, 360];
	return ("linear-gradient(to top, " +
		hues.map(h => "hsl("+h+",100%,50%)").join(",") + ")")
    }

    satGradient() {
	const sats = [0, 20, 40, 60, 80, 100];
	return ("linear-gradient(to top, " +
		sats.map(s => "hsl("+this.h+","+s+"%,50%)").join(",") + ")")
    }

    lightGradient() {
	const lights = [0, 20, 40, 60, 80, 100];
	return ("linear-gradient(to top, " +
		lights.map(l => "hsl("+this.h+","+this.s+"%,"+l+"%)").join(",") + ")")
    }
}
