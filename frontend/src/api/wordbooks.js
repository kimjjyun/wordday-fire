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
  const rows = parseCSV(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('CSV에 단어 데이터가 없습니다.');
  const headers = rows.shift().map(value => value.trim().toLowerCase());
  if (!headers.includes('english') || !headers.includes('korean')) {
    throw new Error('CSV 첫 줄에 english,korean 열이 필요합니다.');
  }
  const words = rows
    .filter(values => values.some(value => value.trim()))
    .map(values => Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ''])));
  const result = await bulkAddWords(id, words);
  return response({ imported: result.data.added, errors: [] });
}

function parseCSV(source) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(value); value = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value); rows.push(row); row = []; value = ''; continue;
    }
    value += char;
  }
  if (value || row.length) { row.push(value); rows.push(row); }
  return rows;
}

export async function deleteWord(id, wordId) {
  return deleteWords(id, [wordId]);
}

export async function deleteWords(id, wordIds) {
  await ownedWordbook(id);
  const recommendedPrefix = `recommended:${id}:`;
  const recommendedNumbers = [];
  const customIds = [];
  for (const wordId of new Set(wordIds)) {
    if (wordId.startsWith(recommendedPrefix)) {
      const wordNumber = Number(wordId.slice(recommendedPrefix.length));
      if (!Number.isInteger(wordNumber)) throw new Error('단어를 찾을 수 없습니다.');
      recommendedNumbers.push(wordNumber);
    } else {
      customIds.push(wordId);
    }
  }
  if (recommendedNumbers.length) {
    await updateDoc(doc(db, 'wordbooks', id), { excludedRecommendedWordNumbers: arrayUnion(...recommendedNumbers) });
  }
  for (let start = 0; start < customIds.length; start += 450) {
    const batch = writeBatch(db);
    customIds.slice(start, start + 450).forEach(wordId => batch.delete(doc(db, 'words', wordId)));
    await batch.commit();
  }
  return response({ deleted: recommendedNumbers.length + customIds.length });
}

export async function deleteWordBook(id) {
  return deleteWordBooks([id]);
}

export async function deleteWordBooks(ids) {
  const books = await Promise.all([...new Set(ids)].map(ownedWordbook));
  const classIds = [...new Set(books.map(book => book.classId))];
  const testGroups = await Promise.all(classIds.map(classId => docsWhere('tests', 'classId', classId)));
  const referencedBookIds = new Set(testGroups.flat().map(test => test.wordBookId));
  if (books.some(book => referencedBookIds.has(book.id))) {
    throw new Error('테스트에서 사용 중인 단어장은 테스트를 먼저 삭제해주세요.');
  }
  for (const book of books) {
    const words = await docsWhere('words', 'wordBookId', book.id);
    for (let start = 0; start < words.length; start += 450) {
      const batch = writeBatch(db);
      words.slice(start, start + 450).forEach(word => batch.delete(doc(db, 'words', word.id)));
      await batch.commit();
    }
    await deleteDoc(doc(db, 'wordbooks', book.id));
  }
  return response({ deleted: books.length });
}
