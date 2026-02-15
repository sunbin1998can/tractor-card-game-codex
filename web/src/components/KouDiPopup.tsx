import { useStore } from '../store';
import { wsClient } from '../wsClient';
import CardFace from './CardFace';

export default function KouDiPopup() {
  const data = useStore((s) => s.kouDiPopup);
  const setKouDiPopup = useStore((s) => s.setKouDiPopup);

  if (!data) return null;

  const stepText = data.pointSteps.length > 0 ? data.pointSteps.join('，') : `${data.total}`;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="panel modal-card">
        <div className="modal-title">抠底</div>
        <div className="modal-text">抠底{stepText}</div>
        <div>
          {data.cards.map((id) => (
            <CardFace key={id} id={id} />
          ))}
        </div>
        <button
          onClick={() => {
            setKouDiPopup(null);
            wsClient.onKouDiAcknowledged();
          }}
        >
          OK
        </button>
      </div>
    </div>
  );
}

