import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from "react";
import { AlertCircle } from "lucide-react";

type Common = { label: string; hint?: string; error?: string | null };

function Shell({ id, label, hint, error, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-on-surface-variant">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} role="alert" className="text-xs font-medium text-error flex items-center gap-1">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden /> {error}
        </p>
      )}
    </div>
  );
}

const describe = (id: string, hint?: string, error?: string | null) =>
  error ? `${id}-err` : hint ? `${id}-hint` : undefined;

export function TextField({ label, hint, error, ...props }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <input id={id} className="field-input" aria-invalid={!!error} aria-describedby={describe(id, hint, error)} {...props} />
    </Shell>
  );
}

export function TextAreaField({ label, hint, error, ...props }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <textarea id={id} className="field-input" aria-invalid={!!error} aria-describedby={describe(id, hint, error)} {...props} />
    </Shell>
  );
}

export function SelectField({
  label, hint, error, children, ...props
}: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <Shell id={id} label={label} hint={hint} error={error}>
      <select id={id} className="field-input" aria-invalid={!!error} aria-describedby={describe(id, hint, error)} {...props}>
        {children}
      </select>
    </Shell>
  );
}

export function FormAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg bg-error-container px-3 py-2.5 text-sm text-[#93000a]">
      <AlertCircle className="size-4 mt-0.5 shrink-0" aria-hidden />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-semibold underline underline-offset-2 cursor-pointer">
          Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon, title, body, children }: { icon: ReactNode; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="surface flex flex-col items-center text-center py-16 px-6">
      <div className="size-16 rounded-full bg-surface-high flex items-center justify-center text-outline mb-4">{icon}</div>
      <h3 className="text-xl font-bold tracking-tight">{title}</h3>
      <p className="text-sm md:text-base text-on-surface-variant max-w-md mt-2">{body}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}
