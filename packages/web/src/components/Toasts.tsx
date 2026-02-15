import { useEffect } from 'react';
import { useStore } from '../store';
import { motion, AnimatePresence } from 'motion/react';

export default function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const announcements = useStore((s) => s.announcements);
  const expireToasts = useStore((s) => s.expireToasts);
  const expireAnnouncements = useStore((s) => s.expireAnnouncements);

  useEffect(() => {
    if (toasts.length === 0 && announcements.length === 0) return;
    const timer = window.setInterval(() => {
      expireToasts();
      expireAnnouncements();
    }, 500);
    return () => window.clearInterval(timer);
  }, [toasts.length, announcements.length, expireToasts, expireAnnouncements]);

  return (
    <>
      {/* Center announcements — narrated events */}
      <div className="announcements-container">
        <AnimatePresence>
          {announcements.map((a) => (
            <motion.div
              key={a.id}
              className="announcement"
              initial={{ opacity: 0, scale: 0.7, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              transition={{ duration: 0.25 }}
            >
              {a.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom-right toasts — system messages */}
      {toasts.length > 0 && (
        <div className="toasts-container">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                className="toast"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.2 }}
              >
                {t.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </>
  );
}
