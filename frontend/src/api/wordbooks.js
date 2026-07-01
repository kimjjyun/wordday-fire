import { addDoc, collection, deleteDoc, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { clean, docsWhere, now, response } from './helpers';

async function ownedWordbook(id) {
  const snap = await getDoc(doc(db, 'wordbooks', id));
  if (!snap.exists()) throw new Error('단어장을 찾을 수 없습니다.');
  const wordbook = { id: snap.id, ...snap.data() };
  const classSnap = await getDoc(doc(db, 'classes', wordbook.classId));
  if (!classSnap.exists() || classSnap.data().teacherId !== useAuthStore.getState().user?.id) throw new Error('권한이 없습니다.');
  return wordbook;
}

export async function createWordBook({ classId, title, week }) {
  const data = { classId, title: clean(title), week: Number(week), isActive: true, createdAt: now() };
  const ref = await addDoc(collection(db, 'wordbooks'), data);
  return response({ id: ref.id, ...data, wordCount: 0 });
}

export async function getWordBook(id) {
  const wordbook = await ownedWordbook(id);
  const words = (await docsWhere('words', 'wordBookId', id)).sort((a, b) => a.order - b.order);
  return response({ ...wordbook, words });
}

export async function getWords(id) {
  await ownedWordbook(id);
  return response((await docsWhere('words', 'wordBookId', id)).sort((a, b) => a.order - b.order));
}

export async function addWord(id, item) {
  await ownedWordbook(id);
  const order = (await docsWhere('words', 'wordBookId', id)).length;
  const data = { english: clean(item.english), korean: clean(item.korean), example: clean(item.example) || null, pronunciation: clean(item.pronunciation) || null, wordBookId: id, order };
  const ref = await addDoc(collection(db, 'words'), data);
  return response({ id: ref.id, ...data });
}

export async function bulkAddWords(id, words) {
  await ownedWordbook(id);
  let order = (await docsWhere('words', 'wordBookId', id)).length;
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
