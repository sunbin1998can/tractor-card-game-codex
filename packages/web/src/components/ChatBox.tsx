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

function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = sessionStorage.getItem(key);
    return v !== null ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function ChatBox() {
  const messages = useStore((s) => s.chatMessages);
  const chatHidden = useStore((s) => s.chatHidden);
  const [text, setText] = useState('');
  const [minimized, setMinimized] = useState(() => loadPref('chat-minimized', true));
  const [side, setSide] = useState<'left' | 'right'>(() => loadPref('chat-side', 'right'));
  const [seenCount, setSeenCount] = useState(messages.length);
  const logRef = useRef<HTMLDivElement | null>(null);
  const t = useT();

  useEffect(() => {
    sessionStorage.setItem('chat-minimized', JSON.stringify(minimized));
  }, [minimized]);

  useEffect(() => {
    sessionStorage.setItem('chat-side', JSON.stringify(side));
  }, [side]);

  // Auto-scroll when expanded
  useEffect(() => {
    if (!logRef.current || minimized) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, minimized]);

  // Mark messages as seen when expanded
  useEffect(() => {
    if (!minimized) setSeenCount(messages.length);
  }, [minimized, messages.length]);

  const unread = minimized ? Math.max(0, messages.length - seenCount) : 0;

  const send = () => {
    const next = text.trim();
    if (!next) return;
    wsClient.sendChat(next);
    setText('');
  };

  const sendReaction = (emoji: string) => {
    wsClient.sendChat(emoji);
  };

  const toggleSide = () => setSide((s) => (s === 'right' ? 'left' : 'right'));

  if (chatHidden) return null;

  return (
    <>
      {/* FAB bubble — always rendered, visible when minimized */}
      {minimized && (
        <button
          className={`chat-fab ${side}`}
          onClick={() => setMinimized(false)}
          aria-label={t('chat.title')}
        >
          {'\uD83D\uDCAC'}
          {unread > 0 && <span className="chat-fab-badge">{unread > 99 ? '99+' : unread}</span>}
        </button>
      )}

      {/* Drawer panel */}
      <div className={`chat-drawer ${side} ${minimized ? 'minimized' : ''}`}>
        <div className="chat-drawer-header">
          <span className="chat-drawer-title">{t('chat.title')}</span>
          <button
            className="chat-drawer-btn"
            onClick={toggleSide}
            aria-label="Move to other side"
            title={side === 'right' ? 'Move to left' : 'Move to right'}
          >
            {side === 'right' ? '\u2190' : '\u2192'}
          </button>
          <button
            className="chat-drawer-btn"
            onClick={() => setMinimized(true)}
            aria-label="Minimize chat"
            title="Minimize"
          >
            {'\u2716'}
          </button>
        </div>
        <div className="chat-drawer-body">
          <div className="chat-log" role="log" aria-live="polite" ref={logRef}>
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
      </div>
    </>
  );
}
