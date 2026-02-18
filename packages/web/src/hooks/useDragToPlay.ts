import { useCallback } from 'react';
import { useStore } from '../store';
import { wsClient } from '../wsClient';
import type { PanInfo } from 'motion/react';

export function useDragToPlay() {
  const phase = useStore((s) => s.publicState?.phase);
  const turnSeat = useStore((s) => s.publicState?.turnSeat);
  const youSeat = useStore((s) => s.youSeat);
  const selected = useStore((s) => s.selected);
  const setDragActive = useStore((s) => s.setDragActive);

  const isYourTurn = turnSeat === youSeat && youSeat !== null;
  const canDragToPlay = phase === 'TRICK_PLAY' && isYourTurn && selected.size > 0;

  const handleDragStart = useCallback(
    (isSelected: boolean) => {
      if (isSelected && canDragToPlay) {
        setDragActive(true);
      }
    },
    [canDragToPlay, setDragActive],
  );

  const handleDragEnd = useCallback(
    (isSelected: boolean, _event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setDragActive(false);
      if (!isSelected || !canDragToPlay) return;

      // Fire play if dragged upward far enough or with enough velocity
      if (info.offset.y < -80 || info.velocity.y < -300) {
        wsClient.send({ type: 'PLAY', cardIds: Array.from(selected) });
      }
    },
    [canDragToPlay, selected, setDragActive],
  );

  return { canDragToPlay, handleDragStart, handleDragEnd };
}
