import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix sidebar HTML paths
const sidebarHtml = path.join(__dirname, 'dist/src/sidebar/index.html');
if (fs.existsSync(sidebarHtml)) {
  let content = fs.readFileSync(sidebarHtml, 'utf8');
  content = content.replace(/src="\/(.+?)"/g, 'src="../../$1"');
  content = content.replace(/href="\/(.+?)"/g, 'href="../../$1"');
  fs.writeFileSync(sidebarHtml, content);
  console.log('Fixed sidebar HTML paths');
}

// Fix popup HTML paths
const popupHtml = path.join(__dirname, 'dist/src/popup/popup.html');
if (fs.existsSync(popupHtml)) {
  let content = fs.readFileSync(popupHtml, 'utf8');
  content = content.replace(/src="\/(.+?)"/g, 'src="../../$1"');
  content = content.replace(/href="\/(.+?)"/g, 'href="../../$1"');
  fs.writeFileSync(popupHtml, content);
  console.log('Fixed popup HTML paths');
}

console.log('Path fixing complete!');