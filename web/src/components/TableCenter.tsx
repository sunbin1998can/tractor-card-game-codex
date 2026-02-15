import { useStore } from '../store';
import { getRelativePosition } from './GameTable';
import CardFace from './CardFace';
import { motion, AnimatePresence } from 'motion/react';

export default function TableCenter() {
  const trick = useStore((s) => s.trickDisplay);
  const seats = useStore((s) => s.publicState?.seats ?? []);
  const youSeat = useStore((s) => s.youSeat);
  const totalPlayers = useStore((s) => s.publicState?.players ?? 4);

  const mySeat = youSeat ?? 0;

  return (
    <div className="table-center">
      <div className="table-center-inner">
        {(!trick || trick.length === 0) ? (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="no-trick-msg">No trick in progress</span>
          </div>
        ) : (
          <AnimatePresence>
            {trick.map((play) => {
              const pos = getRelativePosition(mySeat, play.seat, totalPlayers);
              const name = seats.find((s) => s.seat === play.seat)?.name || `Seat ${play.seat + 1}`;
              return (
                <motion.div
                  key={`trick-${play.seat}`}
                  className={`trick-play pos-${pos}`}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <div>
                    <div className="trick-player-label">{name}</div>
                    <div style={{ display: 'flex' }}>
                      {play.cards.map((c) => (
                        <CardFace key={c} id={c} mini />
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
