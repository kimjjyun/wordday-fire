import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db, firebaseApp } from '../firebase';

const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY?.trim();
const tokenStorageKey = 'wordday-fcm-token';
const tokenOwnerStorageKey = 'wordday-fcm-token-owner';

async function serviceWorkerReady() {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise((_, reject) => setTimeout(
      () => reject(new Error('알림 서비스를 준비하지 못했습니다. 앱을 완전히 종료한 뒤 다시 실행해주세요.')),
      20000,
    )),
  ]);
}

async function messagingApi() {
  const api = await import('firebase/messaging');
  if (!(await api.isSupported())) throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.');
  return { ...api, messaging: api.getMessaging(firebaseApp) };
}

async function tokenId(token) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

async function ensurePushOwner(profile) {
  await auth.authStateReady?.();
  if (!auth.currentUser && profile.role === 'solo') {
    const { signInAnonymously } = await import('firebase/auth');
    await signInAnonymously(auth);
  }
  if (!auth.currentUser) throw new Error('로그인 정보를 확인하지 못했습니다. 다시 시도해주세요.');
  return auth.currentUser.uid;
}

async function savePushSubscription(token, profile) {
  const uid = await ensurePushOwner(profile);
  const id = await tokenId(token);
  await setDoc(doc(db, 'pushTokens', id), {
    token,
    uid,
    role: profile.role,
    userId: profile.id || null,
    classId: profile.classId || null,
    updatedAt: serverTimestamp(),
  }, { merge: true });
  localStorage.setItem(tokenStorageKey, token);
  localStorage.setItem(tokenOwnerStorageKey, uid);
}

function assertReady(profile) {
  if (!window.isSecureContext) throw new Error('알림은 HTTPS에서만 사용할 수 있습니다.');
  if (!('Notification' in window) || !('serviceWorker' in navigator)) {
    throw new Error('이 브라우저는 푸시 알림을 지원하지 않습니다.');
  }
  if (profile.role !== 'solo' && !auth.currentUser) throw new Error('로그인한 뒤 알림을 설정해주세요.');
}

export function getNotificationState(scope = 'account') {
  const permission = 'Notification' in window ? Notification.permission : 'unsupported';
  const token = localStorage.getItem(tokenStorageKey);
  const owner = localStorage.getItem(tokenOwnerStorageKey);
  return {
    permission,
    configured: true,
    usesDefaultKey: !vapidKey,
    hasToken: Boolean(token && (scope === 'solo' || owner === auth.currentUser?.uid)),
  };
}

export async function syncPushSubscription(profile = {}) {
  const token = localStorage.getItem(tokenStorageKey);
  if (!token || Notification.permission !== 'granted') return false;
  await savePushSubscription(token, profile);
  return true;
}

export async function enablePushNotifications(profile = {}) {
  assertReady(profile);
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('알림 권한이 허용되지 않았습니다. 기기 설정에서 허용해주세요.');

  const registration = await serviceWorkerReady();
  const { getToken, messaging } = await messagingApi();
  const options = { serviceWorkerRegistration: registration };
  if (vapidKey) options.vapidKey = vapidKey;
  const token = await getToken(messaging, options);
  if (!token) throw new Error('푸시 알림용 기기 토큰을 만들지 못했습니다.');

  await savePushSubscription(token, profile);
  window.dispatchEvent(new Event('wordday-push-enabled'));
  return token;
}

export async function disablePushNotifications(scope = 'account') {
  const token = localStorage.getItem(tokenStorageKey);
  const ownerUid = localStorage.getItem(tokenOwnerStorageKey);
  if (!token) {
    localStorage.removeItem(tokenOwnerStorageKey);
    return;
  }
  const { deleteToken, messaging } = await messagingApi();
  const tasks = [deleteToken(messaging)];
  await auth.authStateReady?.();
  if (token && auth.currentUser && ownerUid === auth.currentUser.uid) {
    tasks.push(deleteDoc(doc(db, 'pushTokens', await tokenId(token))));
  }
  const results = await Promise.allSettled(tasks);
  localStorage.removeItem(tokenStorageKey);
  localStorage.removeItem(tokenOwnerStorageKey);
  const failure = results.find(result => result.status === 'rejected');
  if (failure) throw failure.reason;
}

export async function showLocalTestNotification() {
  if (Notification.permission !== 'granted') throw new Error('먼저 알림을 허용해주세요.');
  const registration = await serviceWorkerReady();
  await registration.showNotification('WordDay 알림 테스트', {
    body: '이 기기에서 알림이 정상적으로 표시됩니다.',
    icon: '/icons/wordday-192.png',
    badge: '/icons/wordday-192.png',
    data: { url: '/' },
  });
}

export async function listenForForegroundMessages(callback) {
  if (Notification.permission !== 'granted') return () => {};
  const { messaging, onMessage } = await messagingApi();
  return onMessage(messaging, callback);
}
