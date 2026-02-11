import { useStore } from '../store';
import { wsClient } from '../wsClient';

export default function ActionPanel() {
  const selected = useStore((s) => s.selected);
  const clearSelect = useStore((s) => s.clearSelect);
  const legalActions = useStore((s) => s.legalActions);
  const publicState = useStore((s) => s.publicState);
  const youSeat = useStore((s) => s.youSeat);

  const count = selected.size;
  const canPlay = legalActions.some((a) => a.count === count);
  const isYourTurn = publicState?.turnSeat === youSeat;

  return (
    <div className="panel row">
      <button onClick={() => wsClient.send({ type: 'READY' })}>Ready</button>
      <button
        onClick={() => wsClient.send({ type: 'FLIP', cardIds: Array.from(selected) })}
        disabled={count === 0}
      >
        Flip
      </button>
      <button
        onClick={() => wsClient.send({ type: 'SNATCH', cardIds: Array.from(selected) })}
        disabled={count === 0}
      >
        Snatch
      </button>
      <button
        onClick={() => wsClient.send({ type: 'BURY', cardIds: Array.from(selected) })}
        disabled={count === 0}
      >
        Bury
      </button>
      <button
        onClick={() => {
          wsClient.send({ type: 'PLAY', cardIds: Array.from(selected) });
          clearSelect();
        }}
        disabled={!isYourTurn || !canPlay}
      >
        Play
      </button>
      <button onClick={clearSelect}>Cancel</button>
    </div>
  );
}
