import { LEVELS, normalizeLevel } from "../../utils/levels";
import PadleticSelect from "./PadleticSelect";

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
      <PadleticSelect
        value={normalized}
        onChange={(event) => onChange(event.target.value)}
      >
        {includeAll && <option value="all">Każdy poziom</option>}

        {LEVELS.map((level) => (
          <option key={level} value={level}>
            {level}
          </option>
        ))}
      </PadleticSelect>
    </div>
  );
}

export default LevelSelect;
