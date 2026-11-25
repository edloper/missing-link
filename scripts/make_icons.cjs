// Makes the PNG icons for the Home Screen and the web app manifest from
// images/icon.svg.  Run after changing the icon:
//
//     npm ci && npx playwright install webkit
//     node scripts/make_icons.cjs
//
// A "maskable" icon may be cropped to a circle, so its picture is shrunk to
// fit inside the middle 70%.
const fs = require('fs');
const path = require('path');
const {webkit} = require('@playwright/test');

const root = path.join(__dirname, '..');
const svg = fs.readFileSync(path.join(root, 'images', 'icon.svg'), 'utf8');
const maskable = svg.replace('<g id="picture">',
			     '<g id="picture" transform="translate(15 15) scale(0.7)">');
const icons = [
    {file: 'icon-180.png', size: 180, svg},
    {file: 'icon-192.png', size: 192, svg},
    {file: 'icon-512.png', size: 512, svg},
    {file: 'icon-maskable-512.png', size: 512, svg: maskable},
];

(async () => {
    const browser = await webkit.launch();
    for (const icon of icons) {
	const page = await browser.newPage({viewport: {width: icon.size, height: icon.size}});
	const sized = icon.svg.replace('<svg ', `<svg width="${icon.size}" height="${icon.size}" `);
	await page.setContent(`<body style="margin:0">${sized}</body>`);
	await page.screenshot({path: path.join(root, 'images', icon.file)});
	await page.close();
	console.log('wrote images/' + icon.file);
    }
    await browser.close();
})();
