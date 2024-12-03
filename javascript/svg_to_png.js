
// Returns a promise that provides the png.
//
// `scale` will make the svg bigger before rendering it, and then resize
// the result to be smaller after it's converted to png.  This makes it
// slightly less fuzzy, at the expense of processing time.
// (Might actually make it MORE fuzz?  Needs testing)
function svgToPng(svgElement, filename = "svg", scale = 1) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgDataURL = "data:image/svg+xml;base64," + btoa(svgData);
    const width = svgElement.width.baseVal.value;
    const height = svgElement.height.baseVal.value;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
     
    const img = new Image();
    const promise = new Promise((resolve, reject) => {
	img.onload = function() {
	    console.log("Loaded");
	    canvas.width = width * scale;
	    canvas.height = height * scale;
	    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
	    if (scale != 1) {
		const img2 = new Image();
		img2.onload = function() {
		    canvas.width = width;
		    canvas.height = height;
		    ctx.drawImage(img2, 0, 0, width, height);
		    console.log("Got resized png");
		    resolve(canvas.toDataURL('image/png', 1.0));
		}
		img2.src = canvas.toDataURL('image/png', 1.0);
	    } else {
		resolve(canvas.toDataURL('image/png', 1.0));
	    }
	};
    });
    img.src = svgDataURL;
    return promise;
}
