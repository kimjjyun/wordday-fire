import { useState } from 'react';
import { setSecurityQuestion } from '../../api/auth';
import { SECURITY_QUESTIONS } from '../../data/securityQuestions';
import Layout from '../../components/Layout';

const inputCls = 'w-full border border-gray-200 rounded-2xl px-4 py-3.5 text-[15px] outline-none focus:border-black';

export default function TeacherSettingsPage() {
  const [question, setQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async event => {
    event.preventDefault(); setLoading(true); setMessage('');
    try { await setSecurityQuestion({ securityQuestion: question, securityAnswer: answer }); setAnswer(''); setMessage('보안 질문과 답변을 변경했습니다.'); }
    catch (error) { setMessage(error.response?.data?.error || '변경하지 못했습니다.'); }
    finally { setLoading(false); }
  };

  return (
    <Layout title="WORDDAY" back>
      <div className="pb-8 pt-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-300 mb-1">Settings</p>
        <h1 className="text-4xl font-black tracking-tighter">보안 질문</h1>
        <p className="text-[13px] text-gray-400 my-5">비밀번호를 잊었을 때 사용할 질문과 답변입니다. 답변은 대소문자와 앞뒤 공백을 구분하지 않습니다.</p>
        <form onSubmit={submit} className="space-y-3">
          <select className={inputCls} value={question} onChange={event => setQuestion(event.target.value)}>{SECURITY_QUESTIONS.map(value => <option key={value}>{value}</option>)}</select>
          <input className={inputCls} placeholder="보안 질문 답변" value={answer} onChange={event => setAnswer(event.target.value)} required />
          {message && <p className="text-[13px] text-center py-2">{message}</p>}
          <button disabled={loading} className="w-full bg-black text-white font-bold py-4 rounded-full disabled:opacity-40">{loading ? '저장 중...' : '보안 질문 저장'}</button>
        </form>
      </div>
    </Layout>
  );
}
