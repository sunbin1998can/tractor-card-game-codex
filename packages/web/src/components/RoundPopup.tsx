import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';
import CardFace from './CardFace';

const ORDER_LABELS = ['Lead', '2nd', '3rd', '4th', '5th', '6th'];

function countPoints(cardIds: string[]): number {
  let pts = 0;
  for (const id of cardIds) {
    const parts = id.split('_');
    const rank = parts[parts.length - 1];
    if (rank === '5') pts += 5;
    else if (rank === '10' || rank === 'K') pts += 10;
  }
  return pts;
}

export default function RoundPopup() {
  const text = useStore((s) => s.roundPopup);
  const setRoundPopup = useStore((s) => s.setRoundPopup);
  const state = useStore((s) => s.publicState);
  const t = useT();

  const isFinal = !!text && text.includes('Final winners:');
  const rr = state?.lastRoundResult;

  if (!text) return null;

  const seats = state?.seats ?? [];
  const kittyCards = rr?.kittyCards ?? [];
  const trickHistory = rr?.trickHistory ?? [];
  const totalPlayers = state?.players ?? seats.length;

  const orderLabels = ORDER_LABELS.slice(0, totalPlayers);

  const winnerSide = rr?.winnerSide;
  const winnerTeam = rr?.winnerTeam;
  const winnerNames = state
    ? seats
        .filter((s) => s.team === winnerTeam)
        .map((s) => s.name || `${t('seat.seat')} ${s.seat + 1}`)
        .join(' & ')
    : '';

  const kittyPts = countPoints(kittyCards);

  // Per-player total points
  const playerPoints = seats.map((seat) => {
    const cards = (rr?.playedBySeat ?? [])[seat.seat] ?? [];
    return countPoints(cards);
  });

  const seatMap = new Map(seats.map((seat) => [seat.seat, seat]));
  const nameForSeat = (seatId: number) =>
    seatMap.get(seatId)?.name || `${t('seat.seat')} ${seatId + 1}`;
  const getOrderedPlays = (trick: typeof trickHistory[number]) => {
    const total = totalPlayers;
    return Array.from({ length: total }, (_, idx) => {
      const seatIdx = (trick.leader + idx) % total;
      const play = trick.plays.find((p) => p.seat === seatIdx);
      return {
        seatId: seatIdx,
        play,
        isLeader: idx === 0,
      };
    });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="panel modal-card round-result-card">
        <div className="round-result-scroll">
          {rr ? (
            <>
              <div className="round-summary-group">
                <div className={`round-result-banner ${winnerSide === 'DEFENDER' ? 'defender' : 'attacker'}`}>
                  <span className="round-result-winner-text">
                    {winnerNames} {t('round.won')}
                  </span>
                  {isFinal && <span className="round-result-game-over">{t('round.gameOver')}</span>}
                </div>

                <div className="round-result-scores">
                  <div className="round-score-col defender">
                    <span className="round-score-label">{t('round.defenderPts')}</span>
                    <span className="round-score-value">{rr.defenderPoints}</span>
                  </div>
                  <div className="round-score-col attacker">
                    <span className="round-score-label">{t('round.attackerPts')}</span>
                    <span className="round-score-value">{rr.attackerPoints}</span>
                  </div>
                </div>

                <div className="round-analytics">
                  <div className="round-analytics-stat">
                    <span className="round-analytics-label">{t('round.levelChange')}</span>
                    <span className="round-analytics-value">
                      {rr.levelFrom} &rarr; {rr.levelTo}
                    </span>
                  </div>
                  <div className="round-analytics-stat">
                    <span className="round-analytics-label">{t('round.delta')}</span>
                    <span className="round-analytics-value">+{rr.delta}</span>
                  </div>
                  <div className="round-analytics-stat">
                    <span className="round-analytics-label">{t('round.kittyPts')}</span>
                    <span className="round-analytics-value">{kittyPts}</span>
                  </div>
                  <div className="round-analytics-stat">
                    <span className="round-analytics-label">{t('round.totalPts')}</span>
                    <span className="round-analytics-value">{rr.defenderPoints + rr.attackerPoints}</span>
                  </div>
                </div>

                {rr.rolesSwapped && (
                  <div style={{ textAlign: 'center' }}>
                    <span className="round-roles-swapped">
                      {t('round.rolesSwapped')} &middot; {t('round.newBanker')} {rr.newBankerSeat + 1}
                    </span>
                  </div>
                )}
              </div>

              {/* Trick-by-trick table */}
              {trickHistory.length > 0 && (
                <>
                  <div className="trick-table-wrap">
                    <table className="trick-table">
                      <thead>
                        <tr>
                          <th className="trick-table-th trick-num">#</th>
                          {orderLabels.map((label) => (
                            <th key={label} className="trick-table-th">
                              {label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trickHistory.map((trick, trickIdx) => {
                          const orderedPlays = getOrderedPlays(trick);
                          return (
                            <tr key={trickIdx} className="trick-table-row">
                              <td className="trick-table-td trick-num">{trickIdx + 1}</td>
                              {orderedPlays.map(({ seatId, play, isLeader }, idx) => {
                                const isWinner = trick.winnerSeat === seatId;
                                return (
                                  <td
                                    key={`${seatId}-${idx}-${play?.cards?.join('-') ?? 'empty'}`}
                                    className={`trick-table-td ${isWinner ? 'trick-winner-cell' : ''}`}
                                  >
                                    <div className="trick-cell-seat">
                                      <span>{nameForSeat(seatId)}</span>
                                      {isLeader && (
                                        <span className="trick-cell-lead">{t('seat.leader')}</span>
                                      )}
                                    </div>
                                    {play ? (
                                      <div className="trick-cell-cards">
                                        {play.cards.map((c, ci) => (
                                          <CardFace
                                            key={`${trickIdx}-${seatId}-${c}-${ci}`}
                                            id={c}
                                            mini
                                          />
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="trick-cell-empty">&mdash;</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="trick-total-row">
                    {seats.map((seat, i) => (
                      <div key={`total-${seat.seat}`} className="trick-total-info">
                        <span className="trick-total-name">{nameForSeat(seat.seat)}</span>
                        <span className="trick-total-pts">{playerPoints[i]} pts</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Kitty */}
                <div className="round-kitty-block">
                  <div className="round-seat-title">{t('round.buried')}:</div>
                  <div className="round-seat-cards">
                    {kittyCards.map((id, idx) => (
                      <CardFace key={`kitty-${id}-${idx}`} id={id} mini />
                    ))}
                  </div>
                </div>
              </>
          ) : (
            <>
              <div className="modal-title round-result-title">{t('round.title')}</div>
              <pre className="modal-text round-result-text">{text}</pre>
            </>
          )}
        </div>
        <button
          onClick={() => {
            wsClient.announceNextRound();
            wsClient.send({ type: 'NEXT_ROUND' });
            setRoundPopup(null);
          }}
        >
          {t('round.ok')}
        </button>
      </div>
    </div>
  );
}
