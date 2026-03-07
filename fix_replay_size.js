const fs = require('fs');

const filePath = 'src/core/__tests__/dreaming.test.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Pattern to find optimizer configs that need replaySampleSize
// Look for config objects with dreamBatchSize but no replaySampleSize
const pattern = /(dreamBatchSize:\s*\d+,)\n(\s*)(dreamIntervalMs:\s*\d+,)/g;

content = content.replace(pattern, (match, batchSize, indent, intervalMs) => {
  return `${batchSize}\n${indent}replaySampleSize: 2,\n${indent}${intervalMs}`;
});

fs.writeFileSync(filePath, content);
console.log('Fixed replaySampleSize in optimizer configs');
