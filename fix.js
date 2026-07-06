const fs = require('fs');
let c = fs.readFileSync('c:\\dev\\chess-sync-viewer\\src\\App.tsx', 'utf8');

// Fix escaped templates
c = c.replace(/\\\${/g, '${');
c = c.replace(/\\`/g, '`');

// Fix escaped backslashes in regex
c = c.replace(/\\\\\\[/g, '\\[');
c = c.replace(/\\\\\\]/g, '\\]');
c = c.replace(/\\\\d/g, '\\d');

fs.writeFileSync('c:\\dev\\chess-sync-viewer\\src\\App.tsx', c);
console.log("Fixed App.tsx");
