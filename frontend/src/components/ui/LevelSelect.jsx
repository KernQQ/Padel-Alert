import { LEVELS, getLevelMeta, normalizeLevel } from "../../utils/levels";

function LevelSelect({
  value,
  onChange,
  includeAll = false,
  className = ""
}) {
  const normalized = includeAll && value === "all"
    ? "all"
    : normalizeLevel(value);

  return (
    <div className={`pa-level-select ${className}`.trim()}>
      <select
        value={normalized}
        onChange={(event) => onChange(event.target.value)}
      >
        {includeAll && <option value="all">Każdy poziom</option>}

        {LEVELS.map((level) => (
          <option key={level} value={level}>
            {level} · {getLevelMeta(level).label}
          </option>
        ))}
      </select>

      {normalized !== "all" && (
        <span
          className={`pa-level-dot level-${getLevelMeta(normalized).tone}`}
          title={getLevelMeta(normalized).label}
        />
      )}
    </div>
  );
}

export default LevelSelect;
