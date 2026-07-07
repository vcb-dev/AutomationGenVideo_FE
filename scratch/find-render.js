const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/components/thong-ke/presentation/PresentationTab.tsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log('✓ Lines containing "improvements" or "comment":');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('improvements') || lines[i].includes('leaderComment') || lines[i].includes('leader_comment')) {
    console.log(`${i + 1}: ${lines[i].trim()}`);
  }
}
