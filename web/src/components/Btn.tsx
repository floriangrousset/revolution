import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./Icon";

type Kind = "primary" | "solid" | "ghost" | "danger" | "quiet";
type Size = "sm" | "md" | "lg";

export interface BtnProps {
  children?: ReactNode;
  kind?: Kind;
  size?: Size;
  icon?: string;
  iconR?: string;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
  full?: boolean;
}

export function Btn({
  children,
  kind = "ghost",
  size = "md",
  icon,
  iconR,
  onClick,
  disabled,
  style,
  title,
  full,
}: BtnProps) {
  const [h, setH] = useState(false);
  const pads = size === "sm" ? "7px 12px" : size === "lg" ? "13px 24px" : "10px 18px";
  const fs = size === "sm" ? 12.5 : size === "lg" ? 15 : 13.5;
  const base: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: pads,
    borderRadius: "var(--r-md)",
    fontSize: fs,
    fontWeight: 600,
    letterSpacing: ".01em",
    border: "1px solid transparent",
    transition: "all .16s ease",
    whiteSpace: "nowrap",
    width: full ? "100%" : "auto",
    opacity: disabled ? 0.45 : 1,
    pointerEvents: disabled ? "none" : "auto",
    ...style,
  };
  const kinds: Record<Kind, CSSProperties> = {
    primary: {
      background: h
        ? "linear-gradient(180deg,var(--gold-bright),var(--gold))"
        : "linear-gradient(180deg,var(--gold),var(--gold-deep))",
      color: "#1B1405",
      borderColor: "var(--gold-deep)",
      boxShadow: h ? "0 6px 22px rgba(194,161,77,.35)" : "var(--shadow-1)",
    },
    solid: {
      background: h ? "var(--ink3)" : "var(--ink2)",
      color: "var(--txt)",
      borderColor: "var(--ink-line)",
    },
    ghost: {
      background: h ? "var(--ink2)" : "transparent",
      color: "var(--txt-mute)",
      borderColor: "var(--ink-line)",
    },
    danger: {
      background: h ? "rgba(192,57,43,.18)" : "transparent",
      color: "var(--rep-bright)",
      borderColor: "var(--rep-deep)",
    },
    quiet: {
      background: h ? "var(--ink2)" : "transparent",
      color: "var(--txt-mute)",
      borderColor: "transparent",
    },
  };
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ ...base, ...kinds[kind] }}
    >
      {icon && <Icon name={icon} size={size === "sm" ? 14 : 16} />}
      {children}
      {iconR && <Icon name={iconR} size={size === "sm" ? 14 : 16} />}
    </button>
  );
}

export interface IconBtnProps {
  name: string;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  size?: number;
  style?: CSSProperties;
}

export function IconBtn({ name, onClick, title, active, size = 36, style }: IconBtnProps) {
  const [h, setH] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        width: size,
        height: size,
        borderRadius: "var(--r-md)",
        display: "grid",
        placeItems: "center",
        background: active ? "var(--ink3)" : h ? "var(--ink2)" : "transparent",
        border: `1px solid ${active ? "var(--ink-line)" : h ? "var(--ink-line)" : "transparent"}`,
        color: active ? "var(--gold-bright)" : "var(--txt-mute)",
        transition: "all .15s ease",
        ...style,
      }}
    >
      <Icon name={name} size={size * 0.46} />
    </button>
  );
}
