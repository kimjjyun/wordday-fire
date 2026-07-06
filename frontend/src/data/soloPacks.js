import { RECOMMENDED_WORDS, TOTAL_DAYS } from './recommendedWords';

const MIDDLE_PACK = {
  id: 'middle',
  title: '중학 필수 영단어 1800',
  subtitle: '중학교 수준의 기본 어휘를 따로 묶은 가상 유료 팩',
  wordCount: 1800,
  wordsPerDay: 20,
  totalDays: 90,
  badge: '잠금',
  hidden: true,
  loadWords: async () => {
    const mod = await import('./hidden/middleSchoolWords');
    return mod.MIDDLE_SCHOOL_WORDS;
  },
};

export const SOLO_PACKS = [
  {
    id: 'recommended',
    title: '기본 추천 1800',
    subtitle: '현재 무료로 바로 공부하는 팩',
    wordCount: RECOMMENDED_WORDS.length,
    wordsPerDay: 20,
    totalDays: TOTAL_DAYS,
    badge: '무료',
    hidden: false,
    loadWords: async () => RECOMMENDED_WORDS,
  },
  MIDDLE_PACK,
];

const PACK_MAP = Object.fromEntries(SOLO_PACKS.map((pack) => [pack.id, pack]));

export function getSoloPack(packId = 'recommended') {
  return PACK_MAP[packId] || PACK_MAP.recommended;
}

export async function loadSoloPackWords(packId = 'recommended') {
  const pack = getSoloPack(packId);
  return pack.loadWords();
}
