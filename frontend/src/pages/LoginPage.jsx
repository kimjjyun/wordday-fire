import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherLogin, teacherRegister, studentLogin, getSecurityQuestion, resetTeacherPassword } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { SECURITY_QUESTIONS } from '../data/securityQuestions';
import LoadingDots from '../components/LoadingDots';
import ShareButton from '../components/ShareButton';

const STUDENT_LOGIN_STORAGE = 'wordday-student-login';

function savedStudentLogin() {
  try { return JSON.parse(localStorage.getItem(STUDENT_LOGIN_STORAGE) || 'null'); }
  catch { return null; }
}

const TABS = [
  { key: 'student', label: '학생' },
  { key: 'teacher', label: '교사' },
  { key: 'register', label: '교사 가입' },
];

export default function LoginPage() {
  const savedStudent = savedStudentLogin();
  const requestedClass = (new URLSearchParams(window.location.search).get('class') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const [tab, setTab] = useState('student');
  const [form, setForm] = useState({ email: '', password: '', name: '', schoolName: '', studentCode: savedStudent?.studentCode || '', classCode: requestedClass || savedStudent?.classCode || '', securityQuestion: SECURITY_QUESTIONS[0], securityAnswer: '' });
  const [rememberStudent, setRememberStudent] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotQuestion, setForgotQuestion] = useState('');
  const [forgotAnswer, setForgotAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore(state => state.login);
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  useEffect(() => {
    if (token && user?.role) navigate(user.role === 'teacher' ? '/teacher' : '/student', { replace: true });
  }, [token, user?.role, navigate]);
  const set = key => event => setForm(value => ({ ...value, [key]: event.target.value }));
  const inputCls = 'w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] font-medium outline-none focus:border-black transition placeholder:text-gray-300';

  const submit = async event => {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      if (tab === 'student') {
        const result = await studentLogin({ classCode: form.classCode, studentCode: form.studentCode, password: form.password });
        if (rememberStudent) {
          localStorage.setItem(STUDENT_LOGIN_STORAGE, JSON.stringify({ classCode: form.classCode.trim().toUpperCase(), studentCode: form.studentCode.trim() }));
        } else {
          localStorage.removeItem(STUDENT_LOGIN_STORAGE);
        }
        login(result.data.token, { ...result.data.student, role: 'student' });
        navigate('/student');
      } else if (tab === 'teacher') {
        const result = await teacherLogin({ email: form.email, password: form.password });
        login(result.data.token, { ...result.data.teacher, role: 'teacher' });
        navigate('/teacher');
      } else {
        const result = await teacherRegister({ email: form.email, password: form.password, name: form.name, schoolName: form.schoolName, securityQuestion: form.securityQuestion, securityAnswer: form.securityAnswer });
        login(result.data.token, { ...result.data.teacher, role: 'teacher' });
        navigate('/teacher');
      }
    } catch (err) { setError(err.response?.data?.error || err.message || '오류가 발생했습니다.'); }
    finally { setLoading(false); }
  };

  const sendReset = async event => {
    event.preventDefault(); setError(''); setSuccess(''); setLoading(true);
    try {
      if (!forgotQuestion) {
        const result = await getSecurityQuestion(forgotEmail);
        setForgotQuestion(result.data.securityQuestion);
      } else {
        await resetTeacherPassword({ username: forgotEmail, answer: forgotAnswer, newPassword });
        setSuccess('비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.');
      }
    } catch (err) { setError(err.response?.data?.error || '메일을 보내지 못했습니다.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto bg-white px-6">
      <div className="pt-20 pb-10">
        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gray-300 mb-3">Vocabulary App</p>
        <h1 className="text-6xl font-black tracking-tighter leading-none">Word<br />Day.</h1>
        <p className="text-sm text-gray-400 mt-4 font-medium">매일 10분, 단어 하나씩.</p>
      </div>

      {!showForgot && (
        <div className="flex border-b border-gray-100 mb-6">
          {TABS.map(item => (
            <button key={item.key} type="button" onClick={() => { setTab(item.key); setError(''); }}
              className={`flex-1 pb-3 text-[12px] font-bold relative ${tab === item.key ? 'text-black' : 'text-gray-300'}`}>
              {item.label}{tab === item.key && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-0.5 bg-black rounded-full" />}
            </button>
          ))}
        </div>
      )}

      {showForgot ? (
        <form onSubmit={sendReset} className="flex-1 space-y-3">
          <p className="text-[13px] text-gray-400 font-medium pb-1">교사 아이디와 가입할 때 정한 보안 질문 답변으로 비밀번호를 변경합니다.</p>
          <input className={inputCls} placeholder="교사 아이디" value={forgotEmail} onChange={event => setForgotEmail(event.target.value)} disabled={!!forgotQuestion} required />
          {forgotQuestion && <>
            <p className="bg-gray-50 rounded-2xl px-4 py-3 text-[14px] font-bold">{forgotQuestion}</p>
            <input className={inputCls} placeholder="보안 질문 답변" value={forgotAnswer} onChange={event => setForgotAnswer(event.target.value)} required />
            <input className={inputCls} type="password" minLength={8} placeholder="새 비밀번호 (8자 이상)" value={newPassword} onChange={event => setNewPassword(event.target.value)} required />
          </>}
          {error && <p className="text-[13px] bg-gray-50 rounded-2xl px-4 py-3 text-center">{error}</p>}
          {success && <p className="text-[13px] bg-gray-50 rounded-2xl px-4 py-3 text-center">{success}</p>}
          <button disabled={loading || !!success} className="w-full bg-black text-white font-bold py-4 rounded-full">{loading ? <LoadingDots /> : forgotQuestion ? '비밀번호 변경하기' : '보안 질문 확인하기'}</button>
          <button type="button" onClick={() => { setShowForgot(false); setError(''); setSuccess(''); }} className="w-full border border-gray-200 text-gray-400 font-bold py-4 rounded-full">돌아가기</button>
        </form>
      ) : (
        <form onSubmit={submit} className="flex-1 space-y-3">
          {tab === 'register' && <input className={inputCls} placeholder="교사 이름" value={form.name} onChange={set('name')} required />}
          {tab === 'register' && <input className={inputCls} placeholder="학교명" value={form.schoolName} onChange={set('schoolName')} required />}
          {(tab === 'teacher' || tab === 'register') && <input className={inputCls} placeholder="교사 아이디" value={form.email} onChange={set('email')} required />}
          {tab === 'student' && <>
            <input className={inputCls} autoComplete="organization" placeholder="학급 코드" value={form.classCode} onChange={event => setForm(value => ({ ...value, classCode: event.target.value.toUpperCase() }))} required />
            <input className={inputCls} autoComplete="username" placeholder="학번" value={form.studentCode} onChange={set('studentCode')} required />
          </>}
          <input className={inputCls} type="password" autoComplete={tab === 'register' ? 'new-password' : 'current-password'} minLength={tab === 'register' ? 8 : 4} placeholder={tab === 'register' ? '비밀번호 (8자 이상)' : '비밀번호'} value={form.password} onChange={set('password')} required />
          {tab === 'student' && (
            <label className="flex items-center gap-2 px-1 text-[11px] font-medium text-gray-400">
              <input type="checkbox" checked={rememberStudent} onChange={event => setRememberStudent(event.target.checked)} />
              학급 코드와 학번을 이 기기에 기억하기
            </label>
          )}
          {tab === 'register' && <>
            <select className={inputCls} value={form.securityQuestion} onChange={set('securityQuestion')}>{SECURITY_QUESTIONS.map(question => <option key={question}>{question}</option>)}</select>
            <input className={inputCls} placeholder="보안 질문 답변" value={form.securityAnswer} onChange={set('securityAnswer')} required />
            <p className="text-[11px] text-gray-300 px-1">비밀번호를 잊었을 때 답변이 필요합니다.</p>
          </>}
          {error && <p className="text-[13px] bg-gray-50 rounded-2xl px-4 py-3 text-center">{error}</p>}
          <button disabled={loading} className="w-full bg-black text-white font-bold py-4 rounded-full">{loading ? <LoadingDots /> : tab === 'register' ? '가입하기' : '로그인'}</button>
          {tab === 'teacher' && <button type="button" onClick={() => { setShowForgot(true); setError(''); }} className="w-full text-[12px] text-gray-300 py-1">비밀번호를 잊으셨나요?</button>}
        </form>
      )}

      <div className="pb-10 pt-6 text-center space-y-3">
        <Link to="/solo" className="block text-[12px] text-gray-300">로그인 없이 혼자 공부하기 →</Link>
        <ShareButton url="https://wordday.web.app/" label="WordDay 공유하기" className="text-[12px] text-gray-400 font-bold" />
        <Link to="/privacy" className="block text-[11px] text-gray-200">개인정보처리방침</Link>
        <p className="text-[11px] text-gray-200">WordDay © 2026</p>
      </div>
    </div>
  );
}
