interface InputProps {
  label?: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
  minLength?: number;
  autoComplete?: string;
}

export default function Input({
  label, type = "text", value, onChange, placeholder, error,
  required, disabled, multiline, rows = 3, className = "", minLength, autoComplete,
}: InputProps) {
  const base = "w-full px-4 py-2.5 bg-white border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:text-text-muted transition-colors";
  const border = error ? "border-error" : "border-border";

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-text-primary mb-1.5">
          {label}{required && <span className="text-error ml-0.5">*</span>}
        </label>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          rows={rows}
          className={`${base} ${border} resize-none`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          minLength={minLength}
          autoComplete={autoComplete}
          className={`${base} ${border}`}
        />
      )}
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
