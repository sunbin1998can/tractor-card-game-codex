import { useState, useEffect } from 'react';

const STORAGE_KEY = 'devDebugHintDismissed';

export default function DevDebugHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (sessionStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem(STORAGE_KEY, '1');
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  if (!import.meta.env.DEV || !visible) return null;

  const dismiss = () => {
    setVisible(false);
    sessionStorage.setItem(STORAGE_KEY, '1');
  };

  return (
    <div className="dev-debug-hint">
      <a href="/#/debug">Debug component showcase</a>
      <button className="dev-debug-hint-close" onClick={dismiss} aria-label="Close">
        &times;
      </button>
    </div>
  );
}
