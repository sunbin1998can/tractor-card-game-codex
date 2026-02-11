import { useStore } from '../store';

export default function ScoreBoard() {
  const state = useStore((s) => s.publicState);
  if (!state) return null;

  return (
    <div className="panel row">
      <div>Phase: {state.phase}</div>
      <div>Trump: {state.trumpSuit}</div>
      <div>Level: {state.levelRank}</div>
      <div>Scores: {state.scores[0]} / {state.scores[1]}</div>
      <div>Kitty: {state.kittyCount}</div>
    </div>
  );
}
