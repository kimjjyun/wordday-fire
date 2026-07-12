import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export const response = data => Promise.resolve({ data });
export const withId = snap => ({ id: snap.id, ...snap.data() });
export const clean = value => String(value || '').trim();
export const now = () => new Date().toISOString();

export async function docsWhere(name, field, value) {
  const snap = await getDocs(query(collection(db, name), where(field, '==', value)));
  return snap.docs.map(withId);
}

export async function countWhere(name, field, value) {
  const snapshot = await getCountFromServer(query(collection(db, name), where(field, '==', value)));
  return snapshot.data().count;
}

export async function sha256(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export const studentLoginKey = (classCode, studentCode) => sha256(`${clean(classCode).toUpperCase()}:${clean(studentCode)}`);
export const passwordProof = password => sha256(`wordday:${String(password)}`);

export function firebaseError(error, fallback = '오류가 발생했습니다.') {
  const messages = {
    'auth/invalid-email': '올바른 이메일 주소를 입력해주세요.',
    'auth/email-already-in-use': '이미 가입된 이메일입니다.',
    'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
    'auth/too-many-requests': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  };
  const wrapped = new Error(
    messages[error?.code]
    || (error?.code === 'permission-denied' ? fallback : null)
    || error?.message
    || fallback
  );
  wrapped.response = { data: { error: wrapped.message } };
  return wrapped;
}
