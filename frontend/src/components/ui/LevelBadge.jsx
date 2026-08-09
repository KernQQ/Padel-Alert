import { getLevelMeta, normalizeLevel } from "../../utils/levels";

function LevelBadge({ level, compact = false }) {
  const normalized = normalizeLevel(level);
  const meta = getLevelMeta(normalized);

  return (
    <span className={`pa-level-badge level-${meta.tone}`}>
      <strong>📊 {normalized}</strong>
      {!compact && <small>{meta.label}</small>}
    </span>
  );
}

export default LevelBadge;
