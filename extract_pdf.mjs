import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { readFileSync } from 'fs';

const files = [
  ['terms', 'C:/Users/ayuyu/Downloads/規約/terms_of_service_v2.pdf'],
  ['privacy', 'C:/Users/ayuyu/Downloads/規約/privacy_policy_v2.pdf'],
  ['cookie', 'C:/Users/ayuyu/Downloads/規約/cookie_policy_v2.pdf'],
  ['data', 'C:/Users/ayuyu/Downloads/規約/data_handling_policy_v2.pdf'],
];

for (const [name, path] of files) {
  const data = new Uint8Array(readFileSync(path));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  process.stdout.write(`=== ${name} ===\n${text}\n\n`);
}
