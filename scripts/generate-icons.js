const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/logo.svg');
const outDir = path.join(__dirname, '../public/icons');
const svg = fs.readFileSync(svgPath, 'utf-8');

fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  const outPath = path.join(outDir, `icon-${size}.png`);
  fs.writeFileSync(outPath, png);
  console.log(`✓ icon-${size}.png (${png.length} bytes)`);
}
