

class ToggleButton {
    constructor(container, options = {}) {
	this.onClickCallback = options.onClick ?? null;
	this.height = options.height ?? 40;
	this.width = options.width ?? 80;
	this.margin = options.margin ?? 10;
	this.circleMargin = options.circleMargin ?? 5;
	this.offColor = options.offColor ?? '#e04030';
	this.onColor = options.onColor ?? '#30d070';
	if (this.circleMargin * 4 > this.height) {
	    this.circleMargin = this.height / 4.0;
	}
	this.label = options.label ?? "label";
	this.labelColor = options.labelColor ?? "black";
	this.circleSize = this.height - (2 * this.circleMargin);
	if (typeof(this.height) != 'number') {
	    console.error("Expected height to be a number");
	}
	if (typeof(this.width) != 'number') {
	    console.error("Expected width to be a number");
	}
	if (typeof(this.margin) != 'string') {
	    console.error("Expected margin to be a string");
	}
	this.UNCHECKED_BG = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAyklEQVQ4T42TaxHCQAyENw5wAhLACVUAUkABOCkSwEkdhNmbpHNckzv689L98toIAKjqGcAFwElEFr5ln6ruAMwA7iLyFBM/TPDuQSrxwf6fCKBoX2UMIYGYkg8BLOnVg2RiAEexGaQQq4w9e9klcxGLLAUwgDAcihlYAR1IvZA1sz/+AAaQjXhTQQVoe2Yo3E7UQiT2ijeQdojRtClOfVKvMVyVpU594kZK9zzySWTlcNqZY9tjCsUds00+A57z1e35xzlzJjee8xf0HYp+cOZQUQAAAABJRU5ErkJggg==") no-repeat 50px center ' + this.offColor;
	this.CHECKED_BG = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAmUlEQVQ4T6WT0RWDMAhFeZs4ipu0mawZpaO4yevBc6hUIWLNd+4NeQDk5sE/PMkZwFvZywKSTxF5iUgH0C4JHGyF97IggFVSqyCFga0CvQSg70Mdwd8QSSr4sGBMcgavAgdvwQCtApvA2uKr1x7Pu++06ItrF5LXPB/CP4M0kKTwYRIDyRAOR9lJTuF0F0hOAJbKopVHOZN9ACS0UgowIx8ZAAAAAElFTkSuQmCC") no-repeat 10px center ' + this.onColor;
	this.$container = $(container);
	this.$container.append(
	    $("<div class='toggle'><input type='checkbox'/><span class='circle'/></div>" +
	      "<div class='label'>" + this.label + "</div>"));
	this.$toggle = this.$container.find(".toggle");
	this.$checkbox = this.$container.find("input");
	this.$circle = this.$container.find(".circle");
	this.$label = this.$container.find(".label");
	this.$container.css({
	    margin: this.margin,
	    display: 'inline-block',
	    'vertical-align': 'middle',
	});
	this.$toggle.css({
	    background: this.UNCHECKED_BG,
	    width: this.width + 'px',
	    height: this.height + 'px',
	    'border-radius': this.height + 'px',
	    display: 'inline-block',
	    position: 'relative',
	    cursor: 'pointer',
 	});
	this.$circle.css({
	    width: this.circleSize + 'px',
	    height: this.circleSize + 'px',
	    'background-color': '#fff',
	    'border-radius': '50%',
	    position: 'absolute',
	    left: this.circleMargin + 'px',
	    top: this.circleMargin + 'px',
	    'z-index': '10',
	    'pointer-events': 'none',
	});
	this.$checkbox.css({
	    position: 'absolute',
	    left: '0',
	    right: '0',
	    width: '100%',
	    height: '100%',
	    opacity: '0',
	    'z-index': '9',
	    cursor: 'pointer'
	});
	this.$label.css({
	    'text-align': 'center',
	    color: this.labelColor,
	})

	const clickCallback = () => {
	    if (this.isChecked()) {
		this.$toggle.css({background: this.CHECKED_BG});
		this.$circle.css({
		    left: (this.width - this.circleSize - this.circleMargin) + 'px'
		});
	    } else {
		this.$toggle.css({background: this.UNCHECKED_BG});
		this.$circle.css({left: this.circleMargin + 'px'});
	    }
	    this.onClickCallback(this.isChecked());
	}
	this.$checkbox.mousedown(clickCallback);
	this.$checkbox.on('touchstart', clickCallback);
    }

    onClick(callback) {
	this.onClickCallback = callback;
    }

    isChecked() {
	return (this.$checkbox).is(':checked');
    }
}
