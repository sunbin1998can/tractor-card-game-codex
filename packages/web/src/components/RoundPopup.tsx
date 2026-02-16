import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';
import CardFace from './CardFace';

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

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="panel modal-card round-result-card">
        <div className="round-result-scroll">
          {rr ? (
            <>
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

              {/* Trick-by-trick table */}
              {trickHistory.length > 0 && (
                <div className="trick-table-wrap">
                  <table className="trick-table">
                    <thead>
                      <tr>
                        <th className="trick-table-th trick-num">#</th>
                        {seats.map((seat) => (
                          <th key={seat.seat} className="trick-table-th">
                            {seat.name || `${t('seat.seat')} ${seat.seat + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {trickHistory.map((trick, trickIdx) => (
                        <tr key={trickIdx} className="trick-table-row">
                          <td className="trick-table-td trick-num">{trickIdx + 1}</td>
                          {seats.map((seat) => {
                            const play = trick.plays.find((p) => p.seat === seat.seat);
                            const isWinner = trick.winnerSeat === seat.seat;
                            return (
                              <td
                                key={seat.seat}
                                className={`trick-table-td ${isWinner ? 'trick-winner-cell' : ''}`}
                              >
                                {play ? (
                                  <div className="trick-cell-cards">
                                    {play.cards.map((c, ci) => (
                                      <CardFace key={`${trickIdx}-${seat.seat}-${c}-${ci}`} id={c} mini />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="trick-cell-empty">&mdash;</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="trick-table-row trick-totals-row">
                        <td className="trick-table-td trick-num">{t('round.totalPts')}</td>
                        {seats.map((seat, i) => (
                          <td key={seat.seat} className="trick-table-td trick-total-cell">
                            {playerPoints[i]} pts
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
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
