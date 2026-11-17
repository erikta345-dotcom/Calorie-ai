const { Resvg } = require('@resvg/resvg-js');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../public/logo-nutrisnap.svg');
const outDir = path.join(__dirname, '../public/icons');
const svg = fs.readFileSync(svgPath, 'utf-8');

fs.mkdirSync(outDir, { recursive: true });

const outputs = [
  { size: 180, names: ['apple-touch-icon-v2.png'] },
  { size: 192, names: ['icon-192.png', 'icon-192-v2.png'] },
  { size: 512, names: ['icon-512.png', 'icon-512-v2.png'] },
];

for (const { size, names } of outputs) {
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: size } });
  const png = resvg.render().asPng();
  for (const name of names) {
    const outPath = path.join(outDir, name);
    fs.writeFileSync(outPath, png);
    console.log(`✓ ${name} (${png.length} bytes)`);
  }
}
