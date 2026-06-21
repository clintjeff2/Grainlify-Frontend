import fs from 'fs';
import path from 'path';

// Budget can be passed as an argument (e.g. node scripts/check-bundle-size.mjs 1800) or use a default of 1800 KB.
const budgetArg = process.argv[2];
const BUDGET_KB = budgetArg ? parseFloat(budgetArg) : 1800;
const BUDGET_BYTES = BUDGET_KB * 1024;

const distPath = path.resolve('dist/assets');

if (!fs.existsSync(distPath)) {
  console.error('Error: dist/assets directory not found. Please run "npm run build" first.');
  process.exit(1);
}

const files = fs.readdirSync(distPath);
// The main chunk is typically named index-[hash].js
const mainChunkFile = files.find(file => file.startsWith('index-') && file.endsWith('.js'));

if (!mainChunkFile) {
  console.error('Error: Main chunk (index-*.js) not found in dist/assets.');
  process.exit(1);
}

const filePath = path.join(distPath, mainChunkFile);
const stats = fs.statSync(filePath);
const fileSizeKB = (stats.size / 1024).toFixed(2);

console.log(`========================================`);
console.log(`Bundle Size Verification`);
console.log(`========================================`);
console.log(`Main chunk file: ${mainChunkFile}`);
console.log(`Main chunk size: ${fileSizeKB} KB`);
console.log(`Max budget:      ${BUDGET_KB} KB`);
console.log(`========================================`);

if (stats.size > BUDGET_BYTES) {
  console.error(`❌ ERROR: Main chunk size (${fileSizeKB} KB) exceeds the budget of ${BUDGET_KB} KB!`);
  console.error(`Please optimize the bundle or adjust the budget if this was expected.`);
  process.exit(1);
}

console.log(`✅ SUCCESS: Main chunk size is within the budget.`);
process.exit(0);
