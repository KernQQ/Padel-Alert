import { getLevelMeta, normalizeLevel } from "../../utils/levels";

function LevelBadge({ level, compact = false, plain = false }) {
  const normalized = normalizeLevel(level);
  const meta = getLevelMeta(normalized);

  return (
    <span className={`pa-level-badge level-${meta.tone}`}>
      <strong>{plain ? normalized : `📊 ${normalized}`}</strong>
      {!compact && <small>{meta.label}</small>}
    </span>
  );
}

export default LevelBadge;
