import { addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuthStore } from '../store/authStore';
import { RECOMMENDED_WORDS } from '../data/recommendedWords';
import { clean, countWhere, docsWhere, now, passwordProof, response, studentLoginKey } from './helpers';

const ownedClass = async id => {
  const snap = await getDoc(doc(db, 'classes', id));
  if (!snap.exists() || snap.data().teacherId !== useAuthStore.getState().user?.id) throw new Error('학급을 찾을 수 없습니다.');
  return { id: snap.id, ...snap.data() };
};

export async function createClass({ name }) {
  const code = Math.random().toString(36).slice(2, 8).toUpperCase();
  const data = { name: clean(name), code, teacherId: useAuthStore.getState().user.id, createdAt: now() };
  const ref = await addDoc(collection(db, 'classes'), data);
  return response({ id: ref.id, ...data });
}

export async function getClasses() {
  const classes = await docsWhere('classes', 'teacherId', useAuthStore.getState().user.id);
  const result = await Promise.all(classes.map(async cls => ({ ...cls, studentCount: await countWhere('students', 'classId', cls.id) })));
  return response(result.sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function getClass(id) {
  const cls = await ownedClass(id);
  const students = await docsWhere('students', 'classId', id);
  const wordBooks = (await docsWhere('wordbooks', 'classId', id)).filter(item => item.isActive !== false);
  const withCounts = await Promise.all(wordBooks.map(async item => {
    const customCount = await countWhere('words', 'wordBookId', item.id);
    const recommendedCount = item.usesRecommendedWords
      ? RECOMMENDED_WORDS.length - (item.excludedRecommendedWordNumbers?.length || 0)
      : 0;
    return { ...item, wordCount: recommendedCount + customCount };
  }));
  return response({ ...cls, students: students.sort((a, b) => a.studentCode.localeCompare(b.studentCode, undefined, { numeric: true })), wordBooks: withCounts });
}

export async function bulkCreateStudents(id, students) {
  const cls = await ownedClass(id);
  const existing = new Set((await docsWhere('students', 'classId', id)).map(item => item.studentCode));
  const errors = [];
  let created = 0;
  for (const item of students) {
    const studentCode = clean(item.studentCode);
    if (!clean(item.name) || !studentCode || existing.has(studentCode)) { errors.push({ studentCode, reason: '이름/학번 누락 또는 중복' }); continue; }
    const loginKey = await studentLoginKey(cls.code, studentCode);
    const studentRef = doc(collection(db, 'students'));
    await setDoc(studentRef, { name: clean(item.name), studentCode, classId: id, loginKey, createdAt: now() });
    await setDoc(doc(db, 'studentLogins', loginKey), { studentId: studentRef.id, classId: id, passwordHash: await passwordProof(item.password || '1234'), studentUid: null, createdAt: now() });
    existing.add(studentCode); created++;
  }
  return response({ created, errors });
}

export async function updateStudent(classId, studentId, data) {
  await ownedClass(classId);
  const update = {};
  if (clean(data.name)) update.name = clean(data.name);
  // Spark 버전에서는 로그인 매핑을 안전하게 유지하기 위해 학번은 생성 후 고정한다.
  if (data.password) {
    const snap = await getDoc(doc(db, 'students', studentId));
    await updateDoc(doc(db, 'studentLogins', snap.data().loginKey), { passwordHash: await passwordProof(data.password), studentUid: null });
  }
  await updateDoc(doc(db, 'students', studentId), update);
  return response({ id: studentId, ...update });
}

export async function deleteStudent(classId, studentId) {
  await ownedClass(classId);
  const snap = await getDoc(doc(db, 'students', studentId));
  if (snap.exists()) await deleteDoc(doc(db, 'studentLogins', snap.data().loginKey));
  await deleteDoc(doc(db, 'students', studentId));
  return response({ message: '학생을 삭제했습니다.' });
}
