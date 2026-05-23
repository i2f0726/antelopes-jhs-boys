// ===================================================================
// sw.js のバージョンを自動更新するスクリプト（中学生用）
// npm run deploy 実行時に自動で走ります
// ===================================================================

const fs = require('fs');
const path = require('path');

// 更新対象（scoresフォルダなし）
const TARGETS = [
  path.join(__dirname, 'sw.js'),
];

function makeVersion() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}-${hh}${mm}`;
}

const newVersion = makeVersion();
let updatedCount = 0;
let skippedCount = 0;

TARGETS.forEach((swPath) => {
  const label = path.relative(__dirname, swPath);

  if (!fs.existsSync(swPath)) {
    console.log(`⏭️  スキップ（ファイルなし）: ${label}`);
    skippedCount++;
    return;
  }

  let content = fs.readFileSync(swPath, 'utf8');
  const before = content;

  content = content.replace(
    /const\s+CACHE_VERSION\s*=\s*['"][^'"]*['"]\s*;/,
    `const CACHE_VERSION = '${newVersion}';`
  );

  if (content === before) {
    console.warn(`⚠️  CACHE_VERSION が見つかりません: ${label}`);
    skippedCount++;
    return;
  }

  fs.writeFileSync(swPath, content, 'utf8');
  console.log(`✅ ${label} → ${newVersion}`);
  updatedCount++;
});

console.log(`\n📦 ${updatedCount}件更新 / ${skippedCount}件スキップ`);

if (updatedCount === 0) {
  console.error('❌ どのsw.jsも更新できませんでした');
  process.exit(1);
}
