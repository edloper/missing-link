
function stringToPNG(str) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate dimensions to make it roughly square
    canvas.width = Math.ceil(Math.sqrt(str.length));
    canvas.height = Math.ceil(str.length/canvas.width);
    
    // Fill the rest with null.
    str +=  '\0'.repeat((canvas.width * canvas.height) - str.length);
    
    // Draw the string onto the canvas
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < str.length; i++) {
	const charCode = str.charCodeAt(i);
	const r = (charCode >> 16) & 0xff;
	const g = (charCode >> 8) & 0xff;
	const b = charCode & 0xff;
	
	imageData.data[i*4 + 0] = r;
	imageData.data[i*4 + 1] = g;
	imageData.data[i*4 + 2] = b;
	imageData.data[i*4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
}

function PNGToString(dataURL) {
    return new Promise((resolve, reject) => {
	const img = new Image();
	img.src = dataURL;
	img.onload = () => {
	    const canvas = document.createElement('canvas');
	    const ctx = canvas.getContext('2d');
	    canvas.width = img.width;
	    canvas.height = img.height;
	    ctx.drawImage(img, 0, 0);
	    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	    
	    let str = '';
	    for (let i = 0; i < imageData.data.length; i += 4) {
		const r = imageData.data[i];
		const g = imageData.data[i + 1];
		const b = imageData.data[i + 2];
		charCode = (r << 16) | (g << 8) | b;
		if (charCode == 0) {
		    break;
		}
		str += String.fromCharCode(charCode);
            }
	    resolve(str);
	}
	img.onerror = reject;
    });
}
