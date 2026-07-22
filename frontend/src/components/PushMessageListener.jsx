import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function PushMessageListener() {
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};
    const start = async () => {
      unsubscribe();
      const { listenForForegroundMessages } = await import('../api/notifications');
      listenForForegroundMessages(payload => {
        setMessage({
          title: payload.notification?.title || payload.data?.title || 'WordDay',
          body: payload.notification?.body || payload.data?.body || '새로운 소식이 도착했습니다.',
          url: payload.data?.url || '/',
        });
      }).then(fn => { unsubscribe = fn; }).catch(() => {});
    };
    start();
    window.addEventListener('wordday-push-enabled', start);
    return () => {
      window.removeEventListener('wordday-push-enabled', start);
      unsubscribe();
    };
  }, []);

  if (!message) return null;
  return (
    <button
      onClick={() => { const url = message.url; setMessage(null); navigate(url); }}
      className="fixed z-[60] top-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-md bg-black text-white rounded-2xl shadow-xl px-5 py-4 text-left"
    >
      <p className="text-[14px] font-black">{message.title}</p>
      <p className="text-[12px] text-white/70 font-medium mt-1">{message.body}</p>
    </button>
  );
}
