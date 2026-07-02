import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { docsWhere, now, response } from './helpers';
import { wordsForBook } from './wordbooks';

const currentStudent = () => useAuthStore.getState().user;

async function classWords(classId) {
  const books = (await docsWhere('wordbooks', 'classId', classId)).filter(book => book.isActive !== false);
  return (await Promise.all(books.map(book => wordsForBook(book)))).flat();
}

export async function getHomeData() {
  const student = currentStudent();
  const [words, records] = await Promise.all([
    classWords(student.classId),
    docsWhere('studyRecords', 'studentId', student.id),
  ]);
  const recordMap = new Map(records.map(record => [record.wordId, record]));
  const todayWords = words
    .map(word => ({ ...word, ...(recordMap.get(word.id) || { state: 'new', nextReview: now(), stability: 1, difficulty: 5 }) }))
    .filter(word => new Date(word.nextReview) <= new Date())
    .sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview))
    .slice(0, 20);
  const studiedIds = new Set(records.map(record => record.wordId));
  const stats = {
    totalWords: words.length,
    mastered: records.filter(record => record.state === 'review' && record.stability >= 10).length,
    due: words.filter(word => !studiedIds.has(word.id)).length + records.filter(record => new Date(record.nextReview) <= new Date()).length,
  };
  return response({ words: todayWords, stats });
}

export async function getTodayWords() {
  const student = currentStudent();
  const words = await classWords(student.classId);
  const records = await docsWhere('studyRecords', 'studentId', student.id);
  const map = new Map(records.map(record => [record.wordId, record]));
  return response(words.map(word => ({ ...word, ...(map.get(word.id) || { state: 'new', nextReview: now(), stability: 1, difficulty: 5 }) }))
    .filter(word => new Date(word.nextReview) <= new Date()).sort((a, b) => new Date(a.nextReview) - new Date(b.nextReview)).slice(0, 20));
}

function nextReview(record, rating) {
  const value = { stability: 1, difficulty: 5, reps: 0, lapses: 0, state: 'new', ...record };
  if (rating === 1) { value.lapses++; value.stability = Math.max(0.5, value.stability * 0.7); value.state = 'relearning'; }
  else { value.stability += 1.5; value.state = 'review'; }
  value.reps++;
  value.lastReview = now();
  value.nextReview = new Date(Date.now() + (rating === 1 ? 3600000 : value.stability * 86400000)).toISOString();
  return value;
}

export async function submitReview({ wordId, rating }) {
  const student = currentStudent();
  const ref = doc(db, 'studyRecords', `${student.id}_${wordId}`);
  const snap = await getDoc(ref);
  const updated = nextReview(snap.exists() ? snap.data() : {}, Number(rating));
  await setDoc(ref, { ...updated, studentId: student.id, wordId }, { merge: true });
  return response(updated);
}

export async function getStats() {
  const student = currentStudent();
  const words = await classWords(student.classId);
  const records = await docsWhere('studyRecords', 'studentId', student.id);
  const ids = new Set(records.map(record => record.wordId));
  return response({ totalWords: words.length, mastered: records.filter(record => record.state === 'review' && record.stability >= 10).length, due: words.filter(word => !ids.has(word.id)).length + records.filter(record => new Date(record.nextReview) <= new Date()).length });
}

export async function getWrongWords() {
  const student = currentStudent();
  const records = (await docsWhere('studyRecords', 'studentId', student.id)).filter(record => record.lapses > 0).sort((a, b) => b.lapses - a.lapses);
  const result = [];
  for (const record of records) {
    const snap = await getDoc(doc(db, 'words', record.wordId));
    if (snap.exists()) result.push({ id: snap.id, ...snap.data(), lapses: record.lapses });
  }
  return response(result);
}
