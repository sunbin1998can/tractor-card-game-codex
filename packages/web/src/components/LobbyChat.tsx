import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';

export default function LobbyChat() {
  const messages = useStore((s) => s.lobbyMessages);
  const [text, setText] = useState('');
  const logRef = useRef<HTMLDivElement | null>(null);
  const t = useT();

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  const send = () => {
    const next = text.trim();
    if (!next) return;
    wsClient.sendLobbyChat(next);
    setText('');
  };

  return (
    <div className="panel lobby-chat-panel">
      <h3 className="lobby-panel-heading">{t('chat.lobby')}</h3>
      <div className="lobby-chat-log" ref={logRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">{t('chat.noMessages')}</div>
        ) : (
          messages.map((m, idx) => (
            <div key={`${m.atMs}-${idx}`} className="chat-row">
              <span className="chat-name">{m.name}:</span>
              <span className="chat-text">{m.text}</span>
            </div>
          ))
        )}
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
