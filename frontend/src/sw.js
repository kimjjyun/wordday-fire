/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';
import { firebaseConfig } from './firebaseConfig';

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

const messaging = getMessaging(initializeApp(firebaseConfig));

// Firebase Console의 알림 메시지는 SDK가 자동 표시한다. 데이터 전용
// 메시지는 표시할 내용이 없으므로 여기에서 시스템 알림으로 변환한다.
onBackgroundMessage(messaging, payload => {
  if (payload.notification) return;
  const title = payload.data?.title || 'WordDay';
  return self.registration.showNotification(title, {
    body: payload.data?.body || '새로운 소식이 도착했습니다.',
    icon: '/icons/wordday-192.png',
    badge: '/icons/wordday-192.png',
    data: { url: payload.data?.url || '/' },
  });
});

self.addEventListener('notificationclick', event => {
  if (!event.notification.data?.url) return;
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
