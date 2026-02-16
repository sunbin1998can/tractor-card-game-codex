import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export default function EventLog() {
  const events = useStore((s) => s.eventLog);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  const recent = events.slice(-20);

  return (
    <div className="event-log-sidebar" ref={logRef}>
      <div className="event-log-title">Events</div>
      {recent.length === 0 ? (
        <div className="event-log-empty">No events yet</div>
      ) : (
        recent.map((evt) => (
          <div key={evt.id} className="event-log-item-v">{evt.text}</div>
        ))
      )}
    </div>
  );
}
