import { useStore } from '../store';
import { useT } from '../i18n';
import { wsClient } from '../wsClient';
import CardFace from './CardFace';

export default function KouDiPopup() {
  const data = useStore((s) => s.kouDiPopup);
  const setKouDiPopup = useStore((s) => s.setKouDiPopup);
  const t = useT();

  if (!data) return null;

  const stepText = data.pointSteps.length > 0 ? data.pointSteps.join('，') : `${data.total}`;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="panel modal-card">
        <div className="modal-title">{t('koudi.title')}</div>
        <div className="modal-text">{t('koudi.title')}{stepText}</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {data.cards.map((id, i) => (
            <div key={id} className="koudi-card-flip" style={{ animationDelay: `${i * 0.15}s` }}>
              <CardFace id={id} />
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            setKouDiPopup(null);
            wsClient.onKouDiAcknowledged();
          }}
        >
          {t('round.ok')}
        </button>
      </div>
    </div>
  );
}
