import { signInAnonymously, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { clean, firebaseError, passwordProof, response, sha256, studentLoginKey } from './helpers';

const teacherKey = username => sha256(`teacher:${clean(username).toLowerCase()}`);
const answerProof = answer => sha256(`answer:${clean(answer).toLowerCase()}`);

async function freshAnonymousUser() {
  if (auth.currentUser) await signOut(auth);
  return (await signInAnonymously(auth)).user;
}

export async function teacherRegister({ email: username, password, name, schoolName, securityQuestion, securityAnswer }) {
  try {
    if (clean(password).length < 8) throw new Error('교사 비밀번호는 8자 이상 입력해주세요.');
    if (!clean(schoolName)) throw new Error('학교명을 입력해주세요.');
    const user = await freshAnonymousUser();
    const key = await teacherKey(username);
    const loginRef = doc(db, 'teacherLogins', key);
    const data = {
      teacherId: key, username: clean(username), teacherUid: user.uid,
      passwordHash: await passwordProof(password),
      securityAnswerHash: await answerProof(securityAnswer),
      securityQuestion: clean(securityQuestion), createdAt: new Date().toISOString(),
    };
    await setDoc(loginRef, data);
    await setDoc(doc(db, 'teacherSessions', user.uid), { loginKey: key, teacherId: key, createdAt: new Date().toISOString() });
    const teacher = { id: key, username: data.username, name: clean(name), schoolName: clean(schoolName), role: 'teacher', securityQuestion: data.securityQuestion, createdAt: data.createdAt };
    await setDoc(doc(db, 'teachers', key), teacher);
    await setDoc(doc(db, 'teacherQuestions', key), { securityQuestion: data.securityQuestion });
    return response({ token: user.uid, teacher });
  } catch (error) {
    if (auth.currentUser?.isAnonymous) await signOut(auth).catch(() => {});
    throw firebaseError(error, '이미 사용 중인 아이디이거나 가입할 수 없습니다.');
  }
}

export async function teacherLogin({ email: username, password }) {
  try {
    const user = await freshAnonymousUser();
    const key = await teacherKey(username);
    const loginRef = doc(db, 'teacherLogins', key);
    const loginSnap = await getDoc(loginRef);
    if (!loginSnap.exists()) throw new Error('교사 정보를 찾을 수 없습니다.');
    const login = loginSnap.data();
    await updateDoc(loginRef, {
      teacherId: login.teacherId,
      username: login.username,
      passwordHash: login.passwordHash,
      securityAnswerHash: login.securityAnswerHash,
      securityQuestion: login.securityQuestion,
      teacherUid: user.uid,
      claimProof: await passwordProof(password),
      claimedAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'teacherSessions', user.uid), { loginKey: key, teacherId: key, createdAt: new Date().toISOString() });
    const snap = await getDoc(doc(db, 'teachers', key));
    if (!snap.exists()) throw new Error('교사 정보를 찾을 수 없습니다.');
    return response({ token: user.uid, teacher: { id: snap.id, ...snap.data() } });
  } catch (error) {
    if (auth.currentUser?.isAnonymous) await signOut(auth).catch(() => {});
    throw firebaseError(error, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }
}

export async function getSecurityQuestion(username) {
  try {
    if (!auth.currentUser) await signInAnonymously(auth);
    const key = await teacherKey(username);
    const snap = await getDoc(doc(db, 'teacherQuestions', key));
    if (!snap.exists()) throw new Error('가입되지 않은 아이디입니다.');
    return response({ securityQuestion: snap.data().securityQuestion });
  } catch (error) { throw firebaseError(error, '가입되지 않은 아이디입니다.'); }
}

export async function resetTeacherPassword({ username, answer, newPassword }) {
  try {
    if (clean(newPassword).length < 8) throw new Error('새 비밀번호는 8자 이상 입력해주세요.');
    if (!auth.currentUser) await signInAnonymously(auth);
    const key = await teacherKey(username);
    const currentAnswerProof = await answerProof(answer);
    const newPasswordHash = await passwordProof(newPassword);
    await updateDoc(doc(db, 'teacherLogins', key), { currentAnswerProof, newPasswordHash, passwordHash: newPasswordHash, teacherUid: null });
    return response({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) { throw firebaseError(error, '보안 질문 답변이 올바르지 않습니다.'); }
}

export async function setSecurityQuestion({ securityQuestion, securityAnswer }) {
  const key = JSON.parse(localStorage.getItem('wordday-auth') || '{}')?.state?.user?.id;
  const hash = await answerProof(securityAnswer);
  await updateDoc(doc(db, 'teacherLogins', key), { securityQuestion: clean(securityQuestion), securityAnswerHash: hash });
  await setDoc(doc(db, 'teacherQuestions', key), { securityQuestion: clean(securityQuestion) });
  return response({ message: '보안 질문이 저장되었습니다.' });
}

export async function studentLogin({ classCode, studentCode, password }) {
  try {
    const user = await freshAnonymousUser();
    const key = await studentLoginKey(classCode, studentCode);
    const loginRef = doc(db, 'studentLogins', key);
    const loginSnap = await getDoc(loginRef);
    if (!loginSnap.exists()) throw new Error('로그인 정보를 찾을 수 없습니다.');
    const login = loginSnap.data();
    await updateDoc(loginRef, {
      studentId: login.studentId,
      classId: login.classId,
      passwordHash: login.passwordHash,
      studentUid: user.uid,
      claimProof: await passwordProof(password),
      claimedAt: new Date().toISOString(),
    });
    const classPromise = getDoc(doc(db, 'classes', loginSnap.data().classId));
    await setDoc(doc(db, 'studentSessions', user.uid), { loginKey: key, studentId: loginSnap.data().studentId, classId: loginSnap.data().classId, createdAt: new Date().toISOString() });
    const [studentSnap, classSnap] = await Promise.all([
      getDoc(doc(db, 'students', loginSnap.data().studentId)),
      classPromise,
    ]);
    if (!studentSnap.exists() || !classSnap.exists()) throw new Error('학생 정보를 찾을 수 없습니다.');
    return response({ token: user.uid, student: { id: studentSnap.id, ...studentSnap.data(), classId: classSnap.id, class: { id: classSnap.id, name: classSnap.data().name } } });
  } catch (error) {
    if (auth.currentUser?.isAnonymous) await signOut(auth).catch(() => {});
    throw firebaseError(error, '학급 코드, 학번 또는 비밀번호를 확인해주세요.');
  }
}

export async function changeStudentPassword({ currentPassword, newPassword }) {
  const studentId = JSON.parse(localStorage.getItem('wordday-auth') || '{}')?.state?.user?.id;
  const studentSnap = await getDoc(doc(db, 'students', studentId));
  const currentProof = await passwordProof(currentPassword);
  const newPasswordHash = await passwordProof(newPassword);
  try {
    await updateDoc(doc(db, 'studentLogins', studentSnap.data().loginKey), { currentProof, newPasswordHash, passwordHash: newPasswordHash, claimProof: newPasswordHash });
    return response({ message: '비밀번호가 변경되었습니다.' });
  } catch (error) { throw firebaseError(error, '현재 비밀번호가 올바르지 않습니다.'); }
}

export const forgotPassword = ({ email }) => getSecurityQuestion(email);
export const verifySecurity = ({ email, answer, password }) => resetTeacherPassword({ username: email, answer, newPassword: password });
export const resetPasswordApi = () => Promise.reject(firebaseError(null, '로그인 화면에서 비밀번호를 재설정해주세요.'));
export const logoutFirebase = () => signOut(auth);
