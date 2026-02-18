import { useEffect, useRef } from 'react';
import { useStore } from '../store';
import { useT } from '../i18n';

export default function EventLog() {
  const events = useStore((s) => s.eventLog);
  const eventLogVisible = useStore((s) => s.eventLogVisible);
  const toggleEventLogVisible = useStore((s) => s.toggleEventLogVisible);
  const logRef = useRef<HTMLDivElement | null>(null);
  const t = useT();

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  const recent = events.slice(-20);

  return (
    <>
      {/* Mobile toggle button */}
      <button className="event-log-toggle-btn" onClick={toggleEventLogVisible}>
        {eventLogVisible ? t('eventLog.hide') : t('eventLog.show')}
      </button>
      <div className={`event-log-sidebar${!eventLogVisible ? ' hidden-mobile' : ''}`} ref={logRef}>
        <div className="event-log-title">{t('eventLog.title')}</div>
        {recent.length === 0 ? (
          <div className="event-log-empty">{t('eventLog.empty')}</div>
        ) : (
          recent.map((evt) => (
            <div key={evt.id} className="event-log-item-v">{evt.text}</div>
          ))
        )}
      </div>
    </>
  );
}
