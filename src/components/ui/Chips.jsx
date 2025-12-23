// مكون موحد للـ Chips
import Button from "../common/Button";

export default function Chips({ options, value, onChange, disabled = false }) {
  return (
    <div className="chips">
      {options.map(([v, label]) => (
        <Button
          key={v}
          type="button"
          variant={value === v ? "primary" : "secondary"}
          className={`chip ${value === v ? "active" : ""}`}
          onClick={() => !disabled && onChange(v)}
          disabled={disabled}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}

