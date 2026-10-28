const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage, registerFont } = require('canvas');

// EDITABLE BRAND MASTER — hand-drawn geometry based on the supplied reference.
const outputDirectory = path.join(__dirname, 'public/brand/habitu');
registerFont(path.join(outputDirectory, 'source/Manrope.ttf'), { family: 'Manrope' });
const colors = { blue: '#3B4DFF', lime: '#D5FA47', ink: '#171A2B', white: '#F5F7FF' };
const symbolBody = 'M28 0H46C63 0 76 13 76 30V87C89 78 105 74 120 74C170 74 204 113 204 163C204 183 200 204 191 218C186 227 174 231 165 224C159 220 157 214 157 207V181C157 157 143 139 123 134C106 129 93 140 93 157V205C93 220 82 231 67 231H28C12 231 0 218 0 202V29C0 13 12 0 28 0Z';
const symbolAccent = 'M102 157C102 145 110 140 120 144C142 152 150 170 150 192V215C150 225 144 231 134 231H118C108 231 102 225 102 215Z';

// Rounded wordmark glyphs are paths, independent of installed fonts.
const glyphs = [
  [0, 'M9 4H15C22 4 27 9 27 16V39C34 33 41 31 49 31C70 31 80 46 80 65V94C80 100 76 104 70 104H63C56 104 52 100 52 94V66C52 57 48 52 41 52C33 52 27 59 27 68V94C27 100 23 104 17 104H9C3 104 0 100 0 94V15C0 8 3 4 9 4Z'],
  [82, 'M39 31C63 31 78 47 78 69V94C78 101 74 104 67 104H63C57 104 54 101 53 96C47 102 40 106 30 106C10 106 0 90 0 70C0 47 17 31 39 31ZM39 53C29 53 23 60 23 69C23 79 29 85 39 85C48 85 54 79 54 69C54 60 48 53 39 53Z'],
  [162, 'M10 4H16C23 4 27 9 27 16V38C33 33 40 31 47 31C67 31 80 47 80 68C80 91 65 106 41 106C15 106 0 91 0 68V16C0 9 4 4 10 4ZM41 53C32 53 26 60 26 69C26 79 32 85 41 85C51 85 57 79 57 69C57 60 51 53 41 53Z'],
  [244, 'M14 0C22 0 28 6 28 14C28 22 22 28 14 28C6 28 0 22 0 14C0 6 6 0 14 0ZM11 33H17C24 33 28 38 28 45V94C28 100 24 104 18 104H10C4 104 0 100 0 94V45C0 38 4 33 11 33Z'],
  [275, 'M10 8H17C24 8 28 13 28 20V33H42C49 33 53 37 53 44V45C53 51 49 55 42 55H28V73C28 80 31 83 37 83H43C49 83 53 87 53 93V95C53 101 49 105 43 105H32C12 105 0 94 0 74V20C0 13 4 8 10 8Z'],
  [332, 'M10 33H17C24 33 28 37 28 44V70C28 80 33 85 41 85C49 85 54 80 54 70V44C54 37 58 33 65 33H72C79 33 83 37 83 44V69C83 93 67 107 41 107C16 107 0 93 0 69V44C0 37 4 33 10 33Z'],
];

// SVG HELPERS
const svg = (width, height, contents) => `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">${contents}</svg>`;
const symbol = (body = colors.blue, accent = colors.lime) => `<path fill="${body}" d="${symbolBody}"/><path fill="${accent}" d="${symbolAccent}"/>`;
const wordmark = (color) => `<g fill="${color}" fill-rule="evenodd">${glyphs.map(([x, d]) => `<path transform="translate(${x} 0)" d="${d}"/>`).join('')}</g>`;
const horizontal = (ink = colors.ink, blue = colors.blue, accent = colors.lime) => svg(566, 128, `<g transform="scale(.55)">${symbol(blue, accent)}</g><g transform="translate(142 9)">${wordmark(ink)}</g>`);
const stacked = (ink) => svg(258, 244, `<g transform="translate(74 0) scale(.54)">${symbol()}</g><g transform="translate(5 156) scale(.6)">${wordmark(ink)}</g>`);
const withDescriptor = (ink = colors.ink, muted = '#657087') => {
  const canvas = createCanvas(415, 75, 'svg');
  const context = canvas.getContext('2d');
  context.fillStyle = ink; context.font = 'bold 27px Manrope';
  context.fillText('Tu próximo plan, reservado.', 0, 30);
  context.fillStyle = muted; context.font = '24px Manrope';
  context.fillText('Servicios, espacios y experiencias', 0, 65);
  const outlinedText = canvas.toBuffer().toString().replace(/<\?xml[^>]+>\s*/, '');
  return horizontal(ink)
    .replace('height="128"', 'height="210"')
    .replace('viewBox="0 0 566 128"', 'viewBox="0 0 566 210"')
    .replace('</svg>', `<g transform="translate(142 130)">${outlinedText}</g></svg>`);
};
const icon = (size, background, maskable = false) => {
  const scale = (maskable ? .00245 : .00312) * size;
  const x = (size - 204 * scale) / 2;
  const y = (size - 231 * scale) / 2;
  return svg(size, size, `<rect width="${size}" height="${size}" rx="${maskable ? 0 : size * .21}" fill="${background}"/><g transform="translate(${x} ${y}) scale(${scale})">${symbol()}</g>`);
};
const writeSvg = (name, markup) => fs.writeFileSync(path.join(outputDirectory, name), markup);
const writePng = async (name, markup, width, height) => {
  const canvas = createCanvas(width, height);
  canvas.getContext('2d').drawImage(await loadImage(Buffer.from(markup)), 0, 0, width, height);
  fs.writeFileSync(path.join(outputDirectory, name), canvas.toBuffer('image/png'));
};

// EXPORTS
const generate = async () => {
  fs.mkdirSync(outputDirectory, { recursive: true });
  const variants = {
    'logo-horizontal-light.svg': horizontal(),
    'logo-horizontal-dark.svg': horizontal(colors.white),
    'logo-stacked-light.svg': stacked(colors.ink),
    'logo-stacked-dark.svg': stacked(colors.white),
    'logo-descriptor-light.svg': withDescriptor(),
    'logo-descriptor-dark.svg': withDescriptor(colors.white, '#B5BDD6'),
    'logo-mono-ink.svg': horizontal(colors.ink, colors.ink, colors.ink),
    'logo-mono-white.svg': horizontal('#FFFFFF', '#FFFFFF', '#FFFFFF'),
    'logo-negative-blue.svg': horizontal('#FFFFFF', '#FFFFFF', colors.lime),
    'symbol-color.svg': svg(204, 231, symbol()),
    'symbol-dark.svg': svg(204, 231, symbol()),
    'symbol-mono.svg': svg(204, 231, symbol('currentColor', 'currentColor')),
    'symbol-micro.svg': svg(24, 24, `<g transform="translate(2 1) scale(.095)">${symbol()}</g>`),
    'favicon.svg': icon(64, '#FFFFFF'),
  };
  Object.entries(variants).forEach(([name, markup]) => writeSvg(name, markup));
  for (const width of [320, 640, 1280]) {
    await writePng(`logo-horizontal-light-${width}.png`, horizontal(), width, Math.round(width * 128 / 566));
    await writePng(`logo-horizontal-dark-${width}.png`, horizontal(colors.white), width, Math.round(width * 128 / 566));
    await writePng(`logo-descriptor-light-${width}.png`, withDescriptor(), width, Math.round(width * 210 / 566));
    await writePng(`logo-descriptor-dark-${width}.png`, withDescriptor(colors.white, '#B5BDD6'), width, Math.round(width * 210 / 566));
  }
  for (const size of [16, 32]) await writePng(`favicon-${size}.png`, icon(size, '#FFFFFF'), size, size);
  await writePng('apple-touch-icon-180.png', icon(180, '#FFFFFF'), 180, 180);
  for (const size of [192, 512]) {
    await writePng(`app-icon-${size}.png`, icon(size, '#FFFFFF'), size, size);
    await writePng(`app-icon-maskable-${size}.png`, icon(size, '#FFFFFF', true), size, size);
  }
  for (const [suffix, width] of [['1x', 320], ['2x', 640]]) {
    await writePng(`email-logo-light-${suffix}.png`, horizontal(), width, Math.round(width * 128 / 566));
  }

  const png = fs.readFileSync(path.join(outputDirectory, 'favicon-32.png'));
  const header = Buffer.alloc(22);
  header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  header.writeUInt8(32, 6); header.writeUInt8(32, 7);
  header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(outputDirectory, 'favicon.ico'), Buffer.concat([header, png]));

  // Generated directly from vectors; the supplied raster is preserved separately.
  const canvas = createCanvas(1200, 630);
  const context = canvas.getContext('2d');
  context.fillStyle = '#F7F8F2'; context.fillRect(0, 0, 1200, 630);
  context.fillStyle = '#ECEEFF'; context.beginPath(); context.arc(1120, 50, 370, 0, Math.PI * 2); context.fill();
  context.drawImage(await loadImage(Buffer.from(horizontal())), 94, 136, 566, 128);
  context.fillStyle = colors.ink; context.font = 'bold 54px Manrope';
  context.fillText('Tu próximo plan, reservado.', 94, 365);
  context.font = '30px Manrope'; context.fillStyle = '#657087';
  context.fillText('Servicios, espacios y experiencias', 94, 423);
  context.fillStyle = colors.lime; context.fillRect(94, 468, 108, 8);
  fs.writeFileSync(path.join(outputDirectory, 'og-default-1200x630.png'), canvas.toBuffer('image/png'));

  const proof = createCanvas(1200, 1260);
  const proofContext = proof.getContext('2d');
  proofContext.fillStyle = '#F7F8F2'; proofContext.fillRect(0, 0, 1200, 1260);
  proofContext.fillStyle = colors.ink; proofContext.fillRect(600, 0, 600, 560);
  proofContext.fillStyle = colors.blue; proofContext.fillRect(600, 560, 600, 230);
  proofContext.font = 'bold 20px Manrope'; proofContext.fillStyle = colors.ink;
  proofContext.fillText('habitu · variantes y tamaños mínimos', 40, 45);
  proofContext.drawImage(await loadImage(Buffer.from(horizontal())), 40, 105, 500, 113);
  proofContext.drawImage(await loadImage(Buffer.from(horizontal(colors.white))), 640, 105, 500, 113);
  proofContext.drawImage(await loadImage(Buffer.from(stacked(colors.ink))), 40, 280, 220, 208);
  proofContext.drawImage(await loadImage(Buffer.from(stacked(colors.white))), 640, 280, 220, 208);
  proofContext.drawImage(await loadImage(Buffer.from(horizontal(colors.ink, colors.ink, colors.ink))), 40, 610, 500, 113);
  proofContext.drawImage(await loadImage(Buffer.from(horizontal('#FFFFFF', '#FFFFFF', colors.lime))), 640, 610, 500, 113);
  proofContext.fillStyle = colors.ink; proofContext.font = '18px Manrope';
  proofContext.fillText('Firma horizontal · 112 px', 40, 833);
  proofContext.drawImage(await loadImage(Buffer.from(horizontal())), 40, 857, 112, 25.3);
  proofContext.fillText('Símbolo · 16 / 20 / 24 px', 330, 833);
  for (const [index, size] of [16, 20, 24].entries()) {
    proofContext.drawImage(await loadImage(Buffer.from(variants['symbol-micro.svg'])), 330 + index * 65, 857, size, size);
  }
  proofContext.fillText('Icono y zona segura circular', 650, 833);
  proofContext.drawImage(await loadImage(Buffer.from(icon(100, '#FFFFFF', true))), 650, 851, 100, 100);
  proofContext.strokeStyle = '#657087'; proofContext.setLineDash([3, 3]);
  proofContext.beginPath(); proofContext.arc(700, 901, 40, 0, Math.PI * 2); proofContext.stroke();
  proofContext.fillStyle = colors.ink; proofContext.fillRect(600, 990, 600, 270);
  proofContext.drawImage(await loadImage(Buffer.from(withDescriptor())), 40, 1020, 500, 186);
  proofContext.drawImage(await loadImage(Buffer.from(withDescriptor(colors.white, '#B5BDD6'))), 640, 1020, 500, 186);
  fs.writeFileSync(path.join(outputDirectory, 'brand-variants.png'), proof.toBuffer('image/png'));
  console.log('Habitu: SVG, PNG, favicon, PWA and visual proof generated.');
};

generate().catch((error) => { console.error(error); process.exitCode = 1; });
