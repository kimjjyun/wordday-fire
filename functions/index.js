const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

initializeApp();
const db = getFirestore();

function clean(value) {
  return String(value ?? '').trim();
}

function sameAnswer(left, right) {
  return clean(left).toLocaleLowerCase('ko-KR') === clean(right).toLocaleLowerCase('ko-KR');
}

exports.submitTestAnswers = onCall({
  // App Check is enabled separately after the production site key is registered.
  // Anonymous classroom sessions must continue to work before that rollout.
}, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', '학생 로그인 후 제출해주세요.');

  const testId = clean(request.data?.testId);
  const answers = request.data?.answers;
  if (!testId || !answers || typeof answers !== 'object' || Array.isArray(answers)) {
    throw new HttpsError('invalid-argument', '제출할 답안을 확인해주세요.');
  }

  const sessionSnap = await db.doc(`studentSessions/${uid}`).get();
  if (!sessionSnap.exists) throw new HttpsError('permission-denied', '학생 로그인 정보가 만료되었습니다.');
  const session = sessionSnap.data();
  const loginSnap = await db.doc(`studentLogins/${session.loginKey}`).get();
  if (!loginSnap.exists || loginSnap.data().studentUid !== uid) {
    throw new HttpsError('permission-denied', '학생 로그인 정보가 만료되었습니다.');
  }

  const studentId = session.studentId;
  const testRef = db.doc(`tests/${testId}`);
  const [testSnap, keySnap] = await Promise.all([
    testRef.get(),
    db.doc(`testAnswerKeys/${testId}`).get(),
  ]);
  if (!testSnap.exists || !keySnap.exists) {
    throw new HttpsError('failed-precondition', '이 테스트의 정답 정보를 확인할 수 없습니다. 선생님에게 알려주세요.');
  }

  const test = testSnap.data();
  const key = keySnap.data();
  if (test.classId !== session.classId || test.status !== 'active') {
    throw new HttpsError('failed-precondition', '진행 중인 테스트가 아닙니다.');
  }
  if (test.targetStudentIds?.length && !test.targetStudentIds.includes(studentId)) {
    throw new HttpsError('permission-denied', '이 테스트의 참여 대상이 아닙니다.');
  }
  if (!test.joinedStudentIds?.includes(studentId)) {
    throw new HttpsError('failed-precondition', '먼저 테스트에 입장해주세요.');
  }

  const wordAnswers = key.wordAnswers && typeof key.wordAnswers === 'object' ? key.wordAnswers : {};
  const answerEntries = Object.entries(answers).filter(([wordId, value]) => wordId && typeof value === 'string');
  const answered = answerEntries.filter(([, value]) => clean(value)).length;
  const total = Object.keys(wordAnswers).length;
  const score = Object.entries(wordAnswers).filter(([wordId, answer]) => sameAnswer(answers[wordId], answer)).length;
  const resultRef = db.doc(`testResults/${testId}_${studentId}`);
  const previousSnap = await resultRef.get();
  if (previousSnap.exists && previousSnap.data().status === 'submitted') {
    return { score: previousSnap.data().score, total: previousSnap.data().total, answered: previousSnap.data().answered };
  }

  await resultRef.set({
    testId,
    studentId,
    classId: session.classId,
    answers: Object.fromEntries(answerEntries),
    score,
    answered,
    total,
    status: 'submitted',
    submittedAt: FieldValue.serverTimestamp(),
  });

  return { score, total, answered };
});
