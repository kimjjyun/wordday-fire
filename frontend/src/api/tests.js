import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, onSnapshot, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { clean, docsWhere, now, response } from './helpers';
import { bulkAddWords, deleteWordBook, loadWordBookWords } from './wordbooks';

const currentUser = () => useAuthStore.getState().user;
const roomCode = () => Math.random().toString(36).slice(2, 6).toUpperCase();
const resultsForTest = async (classId, testId) =>
  (await docsWhere('testResults', 'classId', classId))
    .filter(result => result.testId === testId && result.status !== 'inProgress');

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
  const test = tests.find(item => item.roomCode === clean(code).toUpperCase() && ['waiting', 'active'].includes(item.status));
  if (!test || (test.targetStudentIds?.length && !test.targetStudentIds.includes(student.id))) throw new Error('입장할 수 없는 시험입니다.');
  await updateDoc(doc(db, 'tests', test.id), { joinedStudentIds: arrayUnion(student.id) });
  return response({ testId: test.id, roomCode: test.roomCode, status: test.status });
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function loadLiveTest(id) {
  const snap = await getDoc(doc(db, 'tests', id));
  if (!snap.exists()) throw new Error('시험을 찾을 수 없습니다.');
  const test = { id: snap.id, ...snap.data() };
  const words = await loadWordBookWords(test.wordBookId);
  const results = currentUser()?.role === 'teacher' ? await resultsForTest(test.classId, test.id) : [];
  let myResult = null;
  if (currentUser()?.role === 'student') {
    try {
      const resultSnap = await getDoc(doc(db, 'testResults', `${id}_${currentUser().id}`));
      if (resultSnap.exists()) myResult = { id: resultSnap.id, ...resultSnap.data() };
    } catch (error) {
      // 아직 결과 문서가 없으면 Firestore 규칙상 permission-denied가 날 수 있다.
      if (error?.code !== 'permission-denied') throw error;
    }
  }
  const scores = results.map(result => result.score);
  return response({ ...test, myResult, studentCount: test.joinedStudentIds?.length || 0, submittedCount: currentUser()?.role === 'teacher' ? results.length : (test.submittedCount || 0), words: test.status === 'waiting' ? [] : words.map(word => ({ id: word.id, english: word.english, answer: word.korean })), avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : (test.avg || 0), topScore: scores.length ? Math.max(...scores) : (test.topScore || 0), total: words.length || test.total || 0 });
}

export async function getLiveTest(id) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await loadLiveTest(id);
    } catch (error) {
      lastError = error;
      // 로그인 직후 새 학생 권한이 Firestore 읽기에 반영될 때까지 잠시 걸릴 수 있다.
      if (error?.code !== 'permission-denied' || attempt === 2) throw error;
      await delay(300 * (attempt + 1));
    }
  }
  throw lastError;
}

export async function saveTestProgress(id, { answers }) {
  const student = currentUser();
  const testSnap = await getDoc(doc(db, 'tests', id));
  if (!testSnap.exists() || testSnap.data().status !== 'active') throw new Error('진행 중인 시험을 찾을 수 없습니다.');
  await setDoc(doc(db, 'testResults', `${id}_${student.id}`), {
    testId: id, studentId: student.id, classId: student.classId,
    answers, answered: Object.values(answers).filter(value => clean(value)).length,
    status: 'inProgress', updatedAt: now(),
  });
  return response({ saved: true });
}

export async function submitAnswers(id, { answers }) {
  const student = currentUser();
  const testSnap = await getDoc(doc(db, 'tests', id));
  const test = testSnap.data();
  const words = await loadWordBookWords(test.wordBookId);
  const score = words.filter(word => clean(answers[word.id]) === clean(word.korean)).length;
  const answered = Object.values(answers).filter(value => clean(value)).length;
  await setDoc(doc(db, 'testResults', `${id}_${student.id}`), { testId: id, studentId: student.id, classId: student.classId, answers, score, answered, total: words.length, status: 'submitted', submittedAt: now() });
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
    rows.push({ id: result.id, studentId: result.studentId, studentName: snap.data()?.name || '알 수 없음', studentCode: snap.data()?.studentCode || '-', score: result.score, total: result.total, answered: result.answered });
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
    const eligible = tests.filter(item => !item.targetStudentIds?.length || item.targetStudentIds.includes(student.id));
    const test = eligible.find(item => item.status === 'active' && item.joinedStudentIds?.includes(student.id))
      || eligible.find(item => item.status === 'active')
      || eligible[0];
    onChange(test ? { id: test.id, roomCode: test.roomCode, status: test.status } : null);
  }, onError);
}

export async function getClassTestHistory(classId) {
  const tests = (await docsWhere('tests', 'classId', classId)).filter(test => test.status === 'finished').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const classResults = await docsWhere('testResults', 'classId', classId);
  const result = [];
  for (const test of tests) {
    const book = await getDoc(doc(db, 'wordbooks', test.wordBookId));
    const rows = classResults.filter(row => row.testId === test.id && row.status !== 'inProgress');
    const scores = rows.map(row => row.score);
    result.push({ id: test.id, wordBookTitle: book.data()?.title || '삭제된 단어장', createdAt: test.createdAt, studentCount: rows.length, avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0, total: rows[0]?.total || 0 });
  }
  return response(result);
}

async function deleteTestsByStatus(classId, ids, allowedStatuses) {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return response({ deleted: 0 });

  const tests = [];
  for (const id of uniqueIds) {
    const snap = await getDoc(doc(db, 'tests', id));
    if (!snap.exists()) continue;
    const test = { id: snap.id, ...snap.data() };
    if (test.classId !== classId || !allowedStatuses.includes(test.status)) {
      throw new Error('삭제할 수 없는 테스트가 포함되어 있습니다.');
    }
    tests.push(test);
  }

  const classResults = await docsWhere('testResults', 'classId', classId);
  const selectedIds = new Set(tests.map(test => test.id));
  await Promise.all(
    classResults
      .filter(result => selectedIds.has(result.testId))
      .map(result => deleteDoc(doc(db, 'testResults', result.id))),
  );
  await Promise.all(tests.map(test => deleteDoc(doc(db, 'tests', test.id))));

  // DAY 시험을 만들 때 생성된 비활성 임시 단어장은 더 이상 참조되지 않으면 함께 정리한다.
  for (const wordBookId of new Set(tests.map(test => test.wordBookId))) {
    const bookSnap = await getDoc(doc(db, 'wordbooks', wordBookId));
    if (!bookSnap.exists() || bookSnap.data().isActive !== false) continue;
    const remainingTests = (await docsWhere('tests', 'classId', classId)).filter(test => test.wordBookId === wordBookId);
    if (remainingTests.length === 0) await deleteWordBook(wordBookId);
  }

  return response({ deleted: tests.length });
}

export const deleteFinishedTests = (classId, ids) => deleteTestsByStatus(classId, ids, ['finished']);
export const deleteOpenTests = (classId, ids) => deleteTestsByStatus(classId, ids, ['waiting', 'active']);

export async function deleteTestResults(testId, ids) {
  const testSnap = await getDoc(doc(db, 'tests', testId));
  if (!testSnap.exists() || testSnap.data().teacherId !== currentUser()?.id || testSnap.data().status !== 'finished') {
    throw new Error('종료된 테스트 결과만 삭제할 수 있습니다.');
  }
  const selectedIds = new Set(ids);
  const results = (await resultsForTest(testSnap.data().classId, testId)).filter(result => selectedIds.has(result.id));
  await Promise.all(results.map(result => deleteDoc(doc(db, 'testResults', result.id))));
  return response({ deleted: results.length });
}

export async function getClassOpenTests(classId) {
  const tests = (await docsWhere('tests', 'classId', classId))
    .filter(test => ['waiting', 'active'].includes(test.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const result = [];
  for (const test of tests) {
    const book = await getDoc(doc(db, 'wordbooks', test.wordBookId));
    result.push({
      id: test.id,
      wordBookTitle: book.data()?.title || '삭제된 단어장',
      createdAt: test.createdAt,
      roomCode: test.roomCode,
      status: test.status,
      studentCount: test.joinedStudentIds?.length || 0,
    });
  }
  return response(result);
}
