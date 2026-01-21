const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, '..', 'assets');

const sizes = [16, 32, 64, 80, 128];

async function generateIcons() {
    for (const size of sizes) {
        const svgContent = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
            <rect width="${size}" height="${size}" rx="${Math.round(size / 8)}" fill="#000"/>
            <text x="${size / 2}" y="${size * 0.7}" font-size="${size * 0.6}" fill="#fff" text-anchor="middle" font-family="Arial, sans-serif" font-weight="bold">N</text>
        </svg>`;

        const outputPath = path.join(assetsDir, `icon-${size}.png`);

        await sharp(Buffer.from(svgContent))
            .png()
            .toFile(outputPath);

        console.log(`Generated: icon-${size}.png`);
    }

    console.log('All icons generated!');
}

generateIcons().catch(console.error);
