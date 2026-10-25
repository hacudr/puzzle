// Counts each field of listing.md against the limit in its heading, as in
// "## Subtitle [30]", and the in-app purchase names and descriptions in
// ios/App/Products.storekit against Apple's 30 and 45: node appstore/check.js
const fs = require('fs');
const path = require('path');

const text = fs.readFileSync(path.join(__dirname, 'listing.md'), 'utf8');
let bad = 0;
const report = (name, length, limit) => {
  const over = length > limit;
  if (over) bad++;
  console.log(`${over ? 'OVER' : 'ok  '} ${name}: ${length} / ${limit}`);
};
for (const [, name, limit, body] of text.matchAll(/^## (.+?) \[(\d+)\]\n([\s\S]*?)(?=^## |(?![\s\S]))/gm)) {
  // the field is the first paragraph, or the whole section for the description
  const field = name === 'Description' ? body.trim() : body.trim().split(/\n\s*\n/)[0];
  report(name, [...field].length, Number(limit));
}
const kit = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'ios', 'App', 'Products.storekit'), 'utf8'));
for (const p of kit.products) {
  for (const l of p.localizations) {
    report(`${p.productID} name`, [...l.displayName].length, 30);
    report(`${p.productID} description`, [...l.description].length, 45);
  }
}
const keywords = (text.match(/^## Keywords \[100\]\n\n(.+)$/m) || [])[1] || '';
if (/, /.test(keywords)) console.log('note: keywords need no space after the commas');
process.exit(bad ? 1 : 0);
