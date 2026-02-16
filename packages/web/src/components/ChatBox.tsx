import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
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

const MOBILE_BREAKPOINT = 600;

function getIsMobile() {
  return typeof window !== 'undefined' && window.innerWidth <= MOBILE_BREAKPOINT;
}

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('resize', cb);
      return () => window.removeEventListener('resize', cb);
    },
    getIsMobile,
    () => false,
  );
}

export default function ChatBox() {
  const messages = useStore((s) => s.chatMessages);
  const chatHidden = useStore((s) => s.chatHidden);
  const toggleChatHidden = useStore((s) => s.toggleChatHidden);
  const [text, setText] = useState('');
  const [seenCount, setSeenCount] = useState(messages.length);
  const logRef = useRef<HTMLDivElement | null>(null);
  const t = useT();
  const isMobile = useIsMobile();

  // Auto-scroll when visible
  useEffect(() => {
    if (!logRef.current || chatHidden) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, chatHidden]);

  // Mark messages as seen when visible
  useEffect(() => {
    if (!chatHidden) setSeenCount(messages.length);
  }, [chatHidden, messages.length]);

  const unread = chatHidden ? Math.max(0, messages.length - seenCount) : 0;

  const send = () => {
    const next = text.trim();
    if (!next) return;
    wsClient.sendChat(next);
    setText('');
  };

  const sendReaction = (emoji: string) => {
    wsClient.sendChat(emoji);
  };

  if (chatHidden) {
    // On mobile, show FAB when chat is hidden
    if (isMobile) {
      return (
        <button
          className="chat-fab"
          onClick={toggleChatHidden}
          aria-label={t('chat.title')}
        >
          {'\uD83D\uDCAC'}
          {unread > 0 && <span className="chat-fab-badge">{unread > 99 ? '99+' : unread}</span>}
        </button>
      );
    }
    // Desktop: no sidebar rendered
    return null;
  }

  const chatContent = (
    <>
      <div className="chat-drawer-header">
        <span className="chat-drawer-title">{t('chat.title')}</span>
        <button
          className="chat-drawer-btn"
          onClick={toggleChatHidden}
          aria-label="Close chat"
          title="Close"
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
    </>
  );

  if (isMobile) {
    return <div className="chat-sidebar chat-sidebar-mobile">{chatContent}</div>;
  }

  return <div className="chat-sidebar">{chatContent}</div>;
}
