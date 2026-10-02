import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

export function cn(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger";
const variants: Record<Variant, string> = {
  // Primary actions are iron-on-chalk: plate colors are reserved for meaning
  primary: "bg-iron text-paper hover:bg-iron/85 font-semibold",
  secondary: "bg-paper text-iron border border-rule hover:border-iron/40",
  ghost: "text-steel hover:text-iron hover:bg-iron/5",
  danger: "text-plate-red border border-plate-red/40 hover:bg-plate-red/10",
};

export function Button({
  variant = "primary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg"; loading?: boolean }) {
  // Phones get thumb-sized targets (~44px); desktop keeps the denser sizes
  // min-height (not height) so a long label wraps inside the button instead of spilling out
  const sizes = {
    sm: "min-h-10 px-3 py-1.5 text-sm sm:min-h-8",
    md: "min-h-11 px-4 py-2 text-base sm:min-h-10 sm:text-[15px]",
    lg: "min-h-14 px-6 py-3 text-lg",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-[var(--r-md)] text-center leading-tight transition-colors disabled:opacity-45 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
}

/** A grouped surface. Use for forms and self-contained tools, not for every block of content. */
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-[var(--r-lg)] border border-rule bg-paper p-4 sm:p-5", className)}>{children}</div>;
}

/** Section heading: condensed display type, sentence case. */
export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h2 className={cn("mb-3 font-display text-xl font-semibold leading-tight", className)}>{children}</h2>;
}

export function PageTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn("font-display text-4xl font-bold leading-none sm:text-5xl", className)}>{children}</h1>;
}

const field =
  // 16px on phones: iOS Safari zooms the page when focusing anything smaller
  "w-full rounded-[var(--r-sm)] border border-rule bg-paper px-3 text-base text-iron sm:text-[15px] placeholder:text-steel/70 focus:outline-none focus:border-plate-blue focus:ring-2 focus:ring-plate-blue/20";

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(field, "h-11 sm:h-10", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(field, "min-h-24 py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(field, "h-11 sm:h-10", className)} {...rest}>
      {children}
    </select>
  );
}

export function Label({ children, hint }: { children: ReactNode; hint?: ReactNode }) {
  return (
    <span className="mb-1.5 block text-sm font-medium">
      {children} {hint && <span className="font-normal text-steel">({hint})</span>}
    </span>
  );
}

export function Chip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "min-h-11 rounded-[var(--r-sm)] border px-3.5 py-2 text-sm transition-colors sm:min-h-9 sm:py-1.5",
        active ? "border-iron bg-iron text-paper" : "border-rule bg-paper text-iron hover:border-iron/40",
      )}
    >
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-steel" role="status">
      <Loader2 className="size-7 animate-spin text-iron" />
      {label && <p className="max-w-sm text-center text-sm">{label}</p>}
    </div>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="border-l-2 border-plate-red bg-plate-red/5 px-3 py-2 text-sm text-plate-red">
      {children}
    </p>
  );
}

/** A number with its label. Numbers use the condensed face so they read like a scoreboard. */
export function Stat({ label, value, hint }: { label: ReactNode; value: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      {label && <p className="text-sm text-steel">{label}</p>}
      <p className="font-display text-3xl font-semibold leading-tight tabular">{value}</p>
      {hint && <p className="text-xs text-steel">{hint}</p>}
    </div>
  );
}
