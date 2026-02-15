import { useStore } from '../store';

function suitSymbol(suit: string) {
  if (suit === 'S') return '\u2660';
  if (suit === 'H') return '\u2665';
  if (suit === 'D') return '\u2666';
  if (suit === 'C') return '\u2663';
  if (suit === 'N') return 'NT';
  return suit;
}

function parsePointCard(id: string): { rank: string; suitSymbol: string; isRed: boolean } | null {
  const parts = id.split('_');
  if (parts.length !== 3) return null;
  const suit = parts[1];
  const rank = parts[2];
  if (rank !== '5' && rank !== '10' && rank !== 'K') return null;

  const symbol =
    suit === 'S' ? '\u2660' :
    suit === 'H' ? '\u2665' :
    suit === 'D' ? '\u2666' :
    suit === 'C' ? '\u2663' :
    '?';
  if (symbol === '?') return null;
  return { rank, suitSymbol: symbol, isRed: suit === 'H' || suit === 'D' };
}

type Props = {
  playerLabel?: string;
  seatLabel?: string;
  roomId?: string;
};

export default function ScoreBoard({ playerLabel, seatLabel, roomId }: Props) {
  const state = useStore((s) => s.publicState);
  if (!state) return null;

  const symbol = suitSymbol(state.trumpSuit);
  const isRed = state.trumpSuit === 'H' || state.trumpSuit === 'D';
  const defenderTeam = state.bankerSeat % 2;
  const defenderScore = state.scores[defenderTeam];
  const attackerScore = state.scores[defenderTeam === 0 ? 1 : 0];
  const attackerTeam = defenderTeam === 0 ? 1 : 0;
  const attackerPointCards = (state.capturedPointCards?.[attackerTeam] ?? [])
    .map(parsePointCard)
    .filter((c): c is { rank: string; suitSymbol: string; isRed: boolean } => c !== null);
  const declarePrompt =
    state.phase === 'FLIP_TRUMP' && state.declareSeat !== undefined
      ? `Declare now: Seat ${state.declareSeat + 1}`
      : null;

  return (
    <div className="panel row">
      {playerLabel && <span className="identity-chip">You: {playerLabel}</span>}
      {seatLabel && <span className="identity-chip">{seatLabel}</span>}
      {roomId && <span className="identity-chip">Room: {roomId}</span>}
      <div className="trump-wrap">
        <span>Trump:</span>
        <span className={`trump-mini-card ${isRed ? 'red' : state.trumpSuit === 'N' ? 'nt' : 'black'}`}>
          {state.levelRank}
          <span className="trump-mini-suit">{symbol}</span>
        </span>
      </div>
      <div className="score-captured-row">
        <span>Scores: Defender {defenderScore} / Attacker {attackerScore}</span>
        <span>Captured by Attacker:</span>
        <span className="captured-cards">
          {attackerPointCards.length === 0 ? (
            <span className="captured-empty">none</span>
          ) : (
            attackerPointCards.map((card, i) => (
              <span
                key={`${card.rank}-${card.suitSymbol}-${i}`}
                className={`captured-mini-card ${card.isRed ? 'red' : 'black'}`}
              >
                {card.rank}
                <span>{card.suitSymbol}</span>
              </span>
            ))
          )}
        </span>
      </div>
      <div>Kitty: {state.kittyCount}</div>
      {declarePrompt && <div>{declarePrompt}</div>}
    </div>
  );
}
