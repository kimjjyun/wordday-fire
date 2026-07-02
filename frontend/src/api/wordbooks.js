import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { RECOMMENDED_WORDS } from '../data/recommendedWords';
import { clean, countWhere, docsWhere, now, response } from './helpers';

async function ownedWordbook(id) {
  const snap = await getDoc(doc(db, 'wordbooks', id));
  if (!snap.exists()) throw new Error('단어장을 찾을 수 없습니다.');
  const wordbook = { id: snap.id, ...snap.data() };
  const classSnap = await getDoc(doc(db, 'classes', wordbook.classId));
  if (!classSnap.exists() || classSnap.data().teacherId !== useAuthStore.getState().user?.id) throw new Error('권한이 없습니다.');
  return wordbook;
}

export async function createWordBook({ classId, title, week, usesRecommendedWords = false }) {
  const data = {
    classId, title: clean(title), week: Number(week), isActive: true,
    usesRecommendedWords, excludedRecommendedWordNumbers: [], createdAt: now(),
  };
  const ref = await addDoc(collection(db, 'wordbooks'), data);
  return response({ id: ref.id, ...data, wordCount: usesRecommendedWords ? RECOMMENDED_WORDS.length : 0 });
}

export async function getWordBook(id) {
  const wordbook = await ownedWordbook(id);
  const words = await wordsForBook(wordbook);
  return response({ ...wordbook, words });
}

export async function getWords(id) {
  const wordbook = await ownedWordbook(id);
  return response(await wordsForBook(wordbook));
}

export async function loadWordBookWords(id) {
  const snap = await getDoc(doc(db, 'wordbooks', id));
  if (!snap.exists()) throw new Error('단어장을 찾을 수 없습니다.');
  return wordsForBook({ id: snap.id, ...snap.data() });
}

export async function wordsForBook(wordbook) {
  const customWords = (await docsWhere('words', 'wordBookId', wordbook.id)).sort((a, b) => a.order - b.order);
  if (!wordbook.usesRecommendedWords) return customWords;

  const excluded = new Set(wordbook.excludedRecommendedWordNumbers || []);
  const recommended = RECOMMENDED_WORDS
    .filter(word => !excluded.has(word.no))
    .map(word => ({
      ...word,
      id: `recommended:${wordbook.id}:${word.no}`,
      wordBookId: wordbook.id,
      order: word.no - 1,
    }));
  return [...recommended, ...customWords];
}

export async function addWord(id, item) {
  const wordbook = await ownedWordbook(id);
  const customCount = await countWhere('words', 'wordBookId', id);
  const order = (wordbook.usesRecommendedWords ? RECOMMENDED_WORDS.length : 0) + customCount;
  const data = { english: clean(item.english), korean: clean(item.korean), example: clean(item.example) || null, pronunciation: clean(item.pronunciation) || null, wordBookId: id, order };
  const ref = await addDoc(collection(db, 'words'), data);
  return response({ id: ref.id, ...data });
}

export async function bulkAddWords(id, words) {
  const wordbook = await ownedWordbook(id);
  const customCount = await countWhere('words', 'wordBookId', id);
  let order = (wordbook.usesRecommendedWords ? RECOMMENDED_WORDS.length : 0) + customCount;
  const valid = words.filter(item => clean(item.english) && clean(item.korean));
  const batchSize = 450;
  for (let start = 0; start < valid.length; start += batchSize) {
    const batch = writeBatch(db);
    for (const item of valid.slice(start, start + batchSize)) {
      const wordRef = doc(collection(db, 'words'));
      batch.set(wordRef, { english: clean(item.english), korean: clean(item.korean), example: clean(item.example) || null, pronunciation: clean(item.pronunciation) || null, wordBookId: id, order: order++ });
    }
    await batch.commit();
  }
  return response({ added: valid.length });
}


export async function importCSV(id, file) {
  const text = await file.text();
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean);
  const headers = lines.shift().split(',').map(value => value.trim().toLowerCase());
  const words = lines.map(line => {
    const values = line.split(',').map(value => value.trim().replace(/^"|"$/g, ''));
    return Object.fromEntries(headers.map((header, index) => [header, values[index] || '']));
  });
  const result = await bulkAddWords(id, words);
  return response({ imported: result.data.added, errors: [] });
}

export async function deleteWord(id, wordId) {
  await ownedWordbook(id);
  const recommendedPrefix = `recommended:${id}:`;
  if (wordId.startsWith(recommendedPrefix)) {
    const wordNumber = Number(wordId.slice(recommendedPrefix.length));
    if (!Number.isInteger(wordNumber)) throw new Error('단어를 찾을 수 없습니다.');
    await updateDoc(doc(db, 'wordbooks', id), { excludedRecommendedWordNumbers: arrayUnion(wordNumber) });
    return response({ message: '단어를 삭제했습니다.' });
  }
  await deleteDoc(doc(db, 'words', wordId));
  return response({ message: '단어를 삭제했습니다.' });
}

export async function deleteWordBook(id) {
  await ownedWordbook(id);
  const words = await docsWhere('words', 'wordBookId', id);
  await Promise.all(words.map(word => deleteDoc(doc(db, 'words', word.id))));
  await deleteDoc(doc(db, 'wordbooks', id));
  return response({ message: '단어장을 삭제했습니다.' });
}
