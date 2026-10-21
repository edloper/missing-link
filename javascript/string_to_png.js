
// The marker cannot occur in legacy pixels, which store 16-bit code units.
const PNG_STRING_MAGIC = 0x4d4c50;

function stringToPNG(str) {
    if (str.length > 0xffffff) { throw new Error('String is too long for PNG encoding'); }
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Calculate dimensions to make it roughly square
    canvas.width = Math.ceil(Math.sqrt(str.length + 2));
    canvas.height = Math.ceil((str.length + 2)/canvas.width);
    
    // Draw the string onto the canvas
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < canvas.width * canvas.height; i++) {
	const charCode = i === 0 ? PNG_STRING_MAGIC : i === 1 ? str.length :
	    (i - 2 < str.length ? str.charCodeAt(i - 2) : 0);
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
	img.onload = () => {
	    try {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		canvas.width = img.width;
		canvas.height = img.height;
		ctx.drawImage(img, 0, 0);
		const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
	    
		const data = imageData.data;
		const pixel = i => (data[4*i] << 16) | (data[4*i+1] << 8) | data[4*i+2];
		const hasLength = pixel(0) === PNG_STRING_MAGIC;
		const start = hasLength ? 2 : 0;
		const length = hasLength ? pixel(1) : data.length / 4;
		if (hasLength && length > data.length / 4 - start) {
		    throw new Error('Incomplete PNG string data');
		}
		let str = '';
		for (let i = 0; i < length; i++) {
		    const charCode = pixel(start + i);
		    if (!hasLength && charCode === 0) { break; }
		    str += String.fromCharCode(charCode);
		}
		resolve(str);
	    } catch (error) { reject(error); }
	}
	img.onerror = reject;
	img.src = dataURL;
    });
}
