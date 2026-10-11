import { useId, useState } from "react";
import { formatBrazilPhone, phoneError } from "@/lib/phone";
export function PhoneField({
  value,
  onChange,
  submitted,
}: {
  value: string;
  onChange: (value: string) => void;
  submitted: boolean;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const error = touched || submitted ? phoneError(value) : "";
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        Seu WhatsApp (com DDD) *
      </label>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        className={`field ${error ? "border-destructive" : ""}`}
        placeholder="(18) 99999-9999"
        value={formatBrazilPhone(value)}
        maxLength={18}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onBlur={() => setTouched(true)}
        onChange={(e) => onChange(formatBrazilPhone(e.target.value))}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
