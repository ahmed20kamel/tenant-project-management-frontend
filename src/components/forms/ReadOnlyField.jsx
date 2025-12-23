// مكون موحد للحقول read-only
import Field from "./Field";

export default function ReadOnlyField({ label, value, hint }) {
  return (
    <Field label={label}>
      <input
        className="input readonly"
        value={value || ""}
        readOnly
        title={hint}
      />
    </Field>
  );
}

