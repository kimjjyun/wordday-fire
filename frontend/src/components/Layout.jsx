import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import PushNotificationMenu from './PushNotificationMenu';

export default function Layout({ title, back = true, children }) {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white">
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur px-5 safe-area-top pb-3 flex items-center gap-3">
        {back && (
          <button
            onClick={() => navigate(-1)}
            className="text-black font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
          >
            ←
          </button>
        )}
        <h1 className="flex-1 font-black text-[15px] tracking-tight text-black">{title ?? 'WORDDAY'}</h1>
        <PushNotificationMenu />
        {user && (
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(user.role === 'teacher' ? '/teacher/settings' : '/student/settings')}
              className="text-xs font-medium text-gray-400 hover:text-black transition max-w-20 truncate"
            >
              {user.name}
            </button>
            <button
              onClick={async () => { await useAuthStore.getState().logout(); navigate('/login'); }}
              className="text-[11px] text-gray-300 hover:text-black transition font-medium"
            >
              로그아웃
            </button>
          </div>
        )}
      </header>
      <div className="h-px bg-gray-100" />
      <main className="flex-1 px-5 py-4">{children}</main>
    </div>
  );
}
