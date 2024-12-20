
// Returns a promise that provides the png.
//
// `scale` will make the svg bigger before rendering it, and then resize
// the result to be smaller after it's converted to png.  This makes it
// slightly less fuzzy, at the expense of processing time.
// (Might actually make it MORE fuzz?  Needs testing)
function svgToPng(svgElement, filename = "svg", scale = 1) {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const encodedSvg = encodeURIComponent(svgData);
    const svgDataURL = "data:image/svg+xml;charset=utf-8," + encodedSvg;
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
	    // -1 to remove border.
	    ctx.drawImage(img, -1, -1, canvas.width, canvas.height);
	    resolve(canvas.toDataURL('image/png', 1.0));
	};
    });
    img.src = svgDataURL;
    return promise;
}
