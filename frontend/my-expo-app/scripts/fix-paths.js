const fs = require('fs');
const path = require('path');

const indexHtml = path.join(__dirname, '../dist/index.html');
let content = fs.readFileSync(indexHtml, 'utf-8');

content = content.replace(/href="\/_expo\//g, 'href="/SwipeVibes/_expo/');
content = content.replace(/src="\/_expo\//g, 'src="/SwipeVibes/_expo/');

fs.writeFileSync(indexHtml, content, 'utf-8');
console.log('✓ Fixed paths');