import { useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { submitFeedback } from '../api';

export default function FeedbackTab() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const nickname = useStore((s) => s.nickname);
  const userId = useStore((s) => s.userId);
  const pushToast = useStore((s) => s.pushToast);
  const t = useT();

  if (!open) {
    return (
      <button
        className="feedback-tab-btn"
        onClick={() => setOpen(true)}
        title={t('feedback.title')}
      >
        {t('feedback.title')}
      </button>
    );
  }

  return (
    <div className="feedback-panel">
      <div className="feedback-header">
        <span className="feedback-title">{t('feedback.title')}</span>
        <button className="chat-drawer-btn" onClick={() => setOpen(false)}>{'\u2716'}</button>
      </div>
      {sent ? (
        <div className="feedback-thanks">{t('feedback.thanks')}</div>
      ) : (
        <>
          <textarea
            className="feedback-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t('feedback.placeholder')}
            maxLength={1000}
            rows={4}
          />
          <button
            className="btn-primary"
            disabled={!text.trim()}
            onClick={async () => {
              try {
                await submitFeedback(nickname || 'Anonymous', userId, text.trim());
                setSent(true);
                pushToast(t('feedback.thanks'));
                setText('');
                setTimeout(() => { setSent(false); setOpen(false); }, 2000);
              } catch {
                pushToast('Failed to send feedback');
              }
            }}
          >
            {t('feedback.send')}
          </button>
        </>
      )}
    </div>
  );
}
