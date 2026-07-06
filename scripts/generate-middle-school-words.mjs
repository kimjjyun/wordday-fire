import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MIDDLE_SCHOOL_CORE } from '../frontend/src/data/hidden/middleSchoolCore.js';
import { EMOTION_WORDS } from '../frontend/src/data/words/emotion.js';
import { SOCIETY_WORDS } from '../frontend/src/data/words/society.js';
import { NATURE_WORDS } from '../frontend/src/data/words/nature.js';
import { ACADEMIC_WORDS } from '../frontend/src/data/words/academic.js';
import { ECONOMY_WORDS } from '../frontend/src/data/words/economy.js';
import { HEALTH_WORDS } from '../frontend/src/data/words/health.js';
import { TECHNOLOGY_WORDS } from '../frontend/src/data/words/technology.js';
import { ACTION_WORDS } from '../frontend/src/data/words/action.js';
import { CULTURE_WORDS } from '../frontend/src/data/words/culture.js';

const frequencyPath = process.env.SUBTLEX_PATH;
if (!frequencyPath) throw new Error('SUBTLEX_PATH 환경 변수가 필요합니다.');
const frequency = JSON.parse(fs.readFileSync(frequencyPath, 'utf8'));
const rank = new Map(frequency.map((item, index) => [item.word.toLowerCase(), index]));
const existing = [...EMOTION_WORDS, ...SOCIETY_WORDS, ...NATURE_WORDS, ...ACADEMIC_WORDS,
  ...ECONOMY_WORDS, ...HEALTH_WORDS, ...TECHNOLOGY_WORDS, ...ACTION_WORDS, ...CULTURE_WORDS]
  .sort((a, b) => (rank.get(a.english.toLowerCase()) ?? 1e9) - (rank.get(b.english.toLowerCase()) ?? 1e9));
const unique = new Map();
for (const word of [...MIDDLE_SCHOOL_CORE, ...existing]) {
  const key = word.english.trim().toLowerCase();
  if (!unique.has(key)) unique.set(key, { english: key, korean: word.korean.trim() });
}
const selected = [...unique.values()].slice(0, 1800);
if (selected.length !== 1800) throw new Error(`단어 수 부족: ${selected.length}`);
const rows = selected.map(word => `  ${JSON.stringify([word.english, word.korean])},`).join('\n');
const output = `// 자동 생성 파일이며 평소 앱 번들에서는 import하지 않습니다.\nconst WORDS = [\n${rows}\n];\n\n` +
  `export const MIDDLE_SCHOOL_WORDS_META = { id: 'middle-1800-v1', title: '중학 필수 영단어 1800', wordCount: 1800, wordsPerDay: 20, totalDays: 90, hidden: true };\n` +
  `export const MIDDLE_SCHOOL_WORDS = WORDS.map(([english, korean], index) => ({ category: 'middle', english, korean, example: '', no: index + 1, day: Math.floor(index / 20) + 1 }));\n`;
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
fs.writeFileSync(path.join(root, 'frontend/src/data/hidden/middleSchoolWords.js'), output, 'utf8');
