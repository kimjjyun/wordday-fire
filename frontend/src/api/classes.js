import { addDoc, arrayRemove, collection, doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
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
  return deleteStudents(classId, [studentId]);
}

async function deleteRefs(refs) {
  // 각 삭제 규칙이 소유권 문서를 조회하므로 배치당 규칙 조회 한도(20회)보다 작게 유지한다.
  const batchSize = 10;
  for (let start = 0; start < refs.length; start += batchSize) {
    const batch = writeBatch(db);
    refs.slice(start, start + batchSize).forEach(ref => batch.delete(ref));
    await batch.commit();
  }
}

export async function deleteStudents(classId, ids) {
  await ownedClass(classId);
  const selectedIds = new Set(ids);
  const students = (await docsWhere('students', 'classId', classId)).filter(student => selectedIds.has(student.id));
  if (!students.length) return response({ deleted: 0 });

  const [classResults, sessions, tests, recordGroups] = await Promise.all([
    docsWhere('testResults', 'classId', classId),
    docsWhere('studentSessions', 'classId', classId),
    docsWhere('tests', 'classId', classId),
    Promise.all(students.map(student => docsWhere('studyRecords', 'studentId', student.id))),
  ]);

  for (const test of tests) {
    const affected = [...(test.targetStudentIds || []), ...(test.joinedStudentIds || [])]
      .some(studentId => selectedIds.has(studentId));
    if (affected) {
      await updateDoc(doc(db, 'tests', test.id), {
        targetStudentIds: arrayRemove(...selectedIds),
        joinedStudentIds: arrayRemove(...selectedIds),
      });
    }
  }

  const refs = [
    ...recordGroups.flat().map(record => doc(db, 'studyRecords', record.id)),
    ...classResults.filter(result => selectedIds.has(result.studentId)).map(result => doc(db, 'testResults', result.id)),
    ...sessions.filter(session => selectedIds.has(session.studentId)).map(session => doc(db, 'studentSessions', session.id)),
    ...students.map(student => doc(db, 'studentLogins', student.loginKey)),
    ...students.map(student => doc(db, 'students', student.id)),
  ];
  await deleteRefs(refs);
  return response({ deleted: students.length });
}

export async function deleteClasses(ids) {
  const uniqueIds = [...new Set(ids)];
  const classes = await Promise.all(uniqueIds.map(ownedClass));

  for (const cls of classes) {
    const [students, wordBooks, tests, results, sessions] = await Promise.all([
      docsWhere('students', 'classId', cls.id),
      docsWhere('wordbooks', 'classId', cls.id),
      docsWhere('tests', 'classId', cls.id),
      docsWhere('testResults', 'classId', cls.id),
      docsWhere('studentSessions', 'classId', cls.id),
    ]);
    const [recordGroups, wordGroups] = await Promise.all([
      Promise.all(students.map(student => docsWhere('studyRecords', 'studentId', student.id))),
      Promise.all(wordBooks.map(book => docsWhere('words', 'wordBookId', book.id))),
    ]);
    await deleteRefs([
      ...recordGroups.flat().map(record => doc(db, 'studyRecords', record.id)),
      ...results.map(result => doc(db, 'testResults', result.id)),
      ...sessions.map(session => doc(db, 'studentSessions', session.id)),
      ...tests.map(test => doc(db, 'tests', test.id)),
      ...wordGroups.flat().map(word => doc(db, 'words', word.id)),
      ...wordBooks.map(book => doc(db, 'wordbooks', book.id)),
      ...students.map(student => doc(db, 'studentLogins', student.loginKey)),
      ...students.map(student => doc(db, 'students', student.id)),
    ]);
    await deleteRefs([doc(db, 'classes', cls.id)]);
  }
  return response({ deleted: classes.length });
}
