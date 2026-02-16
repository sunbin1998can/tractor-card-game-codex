import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';

const QUICK_REACTIONS = [
  { emoji: '\uD83D\uDC4D', label: 'thumbs up' },
  { emoji: '\uD83D\uDC4E', label: 'thumbs down' },
  { emoji: '\uD83D\uDE02', label: 'laugh' },
  { emoji: '\uD83D\uDE22', label: 'cry' },
  { emoji: '\uD83D\uDE31', label: 'wow' },
  { emoji: '\uD83D\uDD25', label: 'fire' },
  { emoji: '\uD83C\uDF89', label: 'party' },
  { emoji: '\uD83D\uDCAF', label: '100' },
];

export default function ChatBox() {
  const messages = useStore((s) => s.chatMessages);
  const [text, setText] = useState('');
  const [collapsed, setCollapsed] = useState(true);
  const logRef = useRef<HTMLDivElement | null>(null);
  const t = useT();

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    const next = text.trim();
    if (!next) return;
    wsClient.sendChat(next);
    setText('');
  };

  const sendReaction = (emoji: string) => {
    wsClient.sendChat(emoji);
  };

  return (
    <div className={`panel chat-panel compact ${collapsed ? 'collapsed' : ''}`}>
      <button className="chat-toggle" onClick={() => setCollapsed(!collapsed)}>
        {collapsed ? `${t('chat.title')} (${messages.length})` : t('chat.hide')}
      </button>
      <div className="chat-log compact" role="log" aria-live="polite" ref={logRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">{t('chat.noMessages')}</div>
        ) : (
          messages.map((m, idx) => (
            <div key={`${m.atMs}-${m.seat}-${idx}`} className="chat-row">
              <span className="chat-name">{m.name || `${t('seat.seat')} ${m.seat + 1}`}:</span>
              <span className="chat-text">{m.text}</span>
            </div>
          ))
        )}
      </div>
      <div className="chat-reactions">
        {QUICK_REACTIONS.map((r) => (
          <button
            key={r.label}
            className="chat-reaction-btn"
            onClick={() => sendReaction(r.emoji)}
            aria-label={r.label}
            title={r.label}
          >
            {r.emoji}
          </button>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          value={text}
          maxLength={200}
          placeholder={t('chat.placeholder')}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              send();
            }
          }}
        />
        <button onClick={send} disabled={!text.trim()}>
          {t('chat.send')}
        </button>
      </div>
    </div>
  );
}
