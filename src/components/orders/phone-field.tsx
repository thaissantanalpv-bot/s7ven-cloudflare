import { useId, useState } from "react";
import { formatBrazilPhone, phoneError } from "@/lib/phone";
export function PhoneField({
  value,
  onChange,
  submitted,
  label = "Seu WhatsApp (com DDD) *",
  compact = false,
  hiddenLabel = false,
  placeholder = "(18) 99999-9999",
}: {
  value: string;
  onChange: (value: string) => void;
  submitted: boolean;
  label?: string;
  compact?: boolean;
  /** Mantém o rótulo para leitores de tela, mas mostra só o texto de exemplo (economiza espaço). */
  hiddenLabel?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [touched, setTouched] = useState(false);
  const error = touched || submitted ? phoneError(value) : "";
  return (
    <div>
      <label htmlFor={id} className={hiddenLabel ? "sr-only" : `mb-1 block font-medium ${compact ? "text-xs" : "text-sm"}`}>
        {label}
      </label>
      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        className={`field ${compact ? "py-2" : ""} ${error ? "border-destructive" : ""}`}
        placeholder={placeholder}
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
