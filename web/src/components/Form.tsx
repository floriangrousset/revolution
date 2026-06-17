import { useState } from "react";
import type {
  CSSProperties,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react";

export interface FieldProps {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
}

export function Field({ label, children, hint }: FieldProps) {
  return (
    <label style={{ display: "block", marginBottom: 16 }}>
      <div
        style={{
          fontSize: 11.5,
          fontWeight: 600,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--txt-faint)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
      {hint && (
        <div style={{ fontSize: 12, color: "var(--txt-faint)", marginTop: 6 }}>{hint}</div>
      )}
    </label>
  );
}

export const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  background: "var(--ink)",
  border: "1px solid var(--ink-line)",
  borderRadius: "var(--r-md)",
  color: "var(--txt)",
  fontSize: 14,
  outline: "none",
  fontFamily: "var(--sans)",
};

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [f, setF] = useState(false);
  return (
    <input
      {...props}
      onFocus={(e) => {
        setF(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setF(false);
        props.onBlur?.(e);
      }}
      style={{
        ...inputStyle,
        borderColor: f ? "var(--gold-deep)" : "var(--ink-line)",
        ...props.style,
      }}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [f, setF] = useState(false);
  return (
    <textarea
      {...props}
      onFocus={(e) => {
        setF(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setF(false);
        props.onBlur?.(e);
      }}
      style={{
        ...inputStyle,
        resize: "vertical",
        minHeight: 90,
        lineHeight: 1.55,
        borderColor: f ? "var(--gold-deep)" : "var(--ink-line)",
        ...props.style,
      }}
    />
  );
}
