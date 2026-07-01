import { addDoc, arrayUnion, collection, doc, getDoc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { clean, docsWhere, now, response } from './helpers';
import { bulkAddWords } from './wordbooks';

const currentUser = () => useAuthStore.getState().user;
const roomCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();
const resultsForTest = async (classId, testId) =>
  (await docsWhere('testResults', 'classId', classId))
    .filter(result => result.testId === testId);

export async function createTest(data) {
  const test = { classId: data.classId, wordBookId: data.wordBookId, roomCode: roomCode(), status: 'waiting', targetStudentIds: data.targetStudentIds || [], joinedStudentIds: [], teacherId: currentUser().id, createdAt: now() };
  const ref = await addDoc(collection(db, 'tests'), test);
  return response({ id: ref.id, ...test });
}

export async function createTestWithWords(data) {
  const wb = { classId: data.classId, title: `DAY 시험 (${new Date().toLocaleDateString('ko-KR')})`, week: 0, isActive: false, createdAt: now() };
  const wbRef = await addDoc(collection(db, 'wordbooks'), wb);
  await bulkAddWords(wbRef.id, data.words);
  return createTest({ classId: data.classId, wordBookId: wbRef.id, targetStudentIds: data.targetStudentIds });
}

export async function startTest(id) { await updateDoc(doc(db, 'tests', id), { status: 'active', startedAt: now() }); return response({ id, status: 'active' }); }
export async function finishTest(id) {
  const testSnap = await getDoc(doc(db, 'tests', id));
  if (!testSnap.exists()) throw new Error('시험을 찾을 수 없습니다.');
  const test = { id: testSnap.id, ...testSnap.data() };
  const results = await resultsForTest(test.classId, id);
  const scores = results.map(result => result.score);
  const summary = {
    status: 'finished', finishedAt: now(), submittedCount: results.length,
    avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0,
    topScore: scores.length ? Math.max(...scores) : 0,
    total: results[0]?.total || 0,
  };
  await updateDoc(doc(db, 'tests', id), summary);
  return response({ id, ...summary });
}

export async function joinTest(code) {
  const student = currentUser();
  const tests = await docsWhere('tests', 'classId', student.classId);
  const test = tests.find(item => item.roomCode === clean(code).toUpperCase() && item.status === 'waiting');
  if (!test || (test.targetStudentIds?.length && !test.targetStudentIds.includes(student.id))) throw new Error('입장할 수 없는 시험입니다.');
  await updateDoc(doc(db, 'tests', test.id), { joinedStudentIds: arrayUnion(student.id) });
  return response({ testId: test.id, roomCode: test.roomCode });
}

export async function getLiveTest(id) {
  const snap = await getDoc(doc(db, 'tests', id));
  if (!snap.exists()) throw new Error('시험을 찾을 수 없습니다.');
  const test = { id: snap.id, ...snap.data() };
  const words = (await docsWhere('words', 'wordBookId', test.wordBookId)).sort((a, b) => a.order - b.order);
  const results = currentUser()?.role === 'teacher' ? await resultsForTest(test.classId, test.id) : [];
  const scores = results.map(result => result.score);
  return response({ ...test, studentCount: test.joinedStudentIds?.length || 0, submittedCount: currentUser()?.role === 'teacher' ? results.length : (test.submittedCount || 0), words: test.status === 'waiting' ? [] : words.map(word => ({ id: word.id, english: word.english, answer: word.korean })), avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : (test.avg || 0), topScore: scores.length ? Math.max(...scores) : (test.topScore || 0), total: words.length || test.total || 0 });
}

export async function submitAnswers(id, { answers }) {
  const student = currentUser();
  const testSnap = await getDoc(doc(db, 'tests', id));
  const test = testSnap.data();
  const words = await docsWhere('words', 'wordBookId', test.wordBookId);
  const score = words.filter(word => clean(answers[word.id]) === clean(word.korean)).length;
  const answered = Object.values(answers).filter(value => clean(value)).length;
  await setDoc(doc(db, 'testResults', `${id}_${student.id}`), { testId: id, studentId: student.id, classId: student.classId, answers, score, answered, total: words.length, submittedAt: now() });
  return response({ score, total: words.length });
}

export async function getResults(id) {
  const testSnap = await getDoc(doc(db, 'tests', id));
  if (!testSnap.exists()) throw new Error('시험을 찾을 수 없습니다.');
  const test = { id: testSnap.id, ...testSnap.data() };
  const results = await resultsForTest(test.classId, id);
  const rows = [];
  for (const result of results) {
    const snap = await getDoc(doc(db, 'students', result.studentId));
    rows.push({ studentName: snap.data()?.name || '알 수 없음', studentCode: snap.data()?.studentCode || '-', score: result.score, total: result.total, answered: result.answered });
  }
  rows.sort((a, b) => b.score - a.score);
  const scores = rows.map(row => row.score);
  return response({ avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0, topScore: scores.length ? Math.max(...scores) : 0, results: rows });
}

export function subscribeClassActiveTest(onChange, onError = () => {}) {
  const student = currentUser();
  const activeTests = query(collection(db, 'tests'), where('classId', '==', student.classId));
  return onSnapshot(activeTests, snapshot => {
    const tests = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() }))
      .filter(test => ['waiting', 'active'].includes(test.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const test = tests.find(item => !item.targetStudentIds?.length || item.targetStudentIds.includes(student.id));
    onChange(test ? { id: test.id, roomCode: test.roomCode, status: test.status } : null);
  }, onError);
}

export async function getClassTestHistory(classId) {
  const tests = (await docsWhere('tests', 'classId', classId)).filter(test => test.status === 'finished').sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  const classResults = await docsWhere('testResults', 'classId', classId);
  const result = [];
  for (const test of tests) {
    const book = await getDoc(doc(db, 'wordbooks', test.wordBookId));
    const rows = classResults.filter(row => row.testId === test.id);
    const scores = rows.map(row => row.score);
    result.push({ id: test.id, wordBookTitle: book.data()?.title || '삭제된 단어장', createdAt: test.createdAt, studentCount: rows.length, avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0, total: rows[0]?.total || 0 });
  }
  return response(result);
}
