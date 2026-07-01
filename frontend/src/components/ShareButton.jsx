import { useState } from 'react';

export default function ShareButton({ title = 'WordDay', text = '매일 10분, 영어 단어 하나씩.', url = window.location.href, label = '공유하기', className = '' }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        await navigator.clipboard.writeText(url).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    }
  };

  return (
    <button type="button" onClick={share} className={className}>
      {copied ? '주소 복사됨' : label}
    </button>
  );
}
