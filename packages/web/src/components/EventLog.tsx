import { useEffect, useRef } from 'react';
import { useStore } from '../store';

export default function EventLog() {
  const events = useStore((s) => s.eventLog);
  const logRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!logRef.current) return;
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [events]);

  const recent = events.slice(-5);
  if (recent.length === 0) return null;

  return (
    <div className="event-log" ref={logRef}>
      {recent.map((evt) => (
        <span key={evt.id} className="event-log-item">{evt.text}</span>
      ))}
    </div>
  );
}
