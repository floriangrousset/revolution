import type { ReactNode } from "react";
import { IconBtn } from "./Btn";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  width?: number;
  title?: ReactNode;
  eyebrow?: ReactNode;
}

export function Modal({ open, onClose, children, width = 560, title, eyebrow }: ModalProps) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      className="fade"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        background: "rgba(5,10,18,0.72)",
        backdropFilter: "blur(6px)",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="ink-panel rise"
        style={{
          width,
          maxWidth: "100%",
          maxHeight: "88vh",
          overflow: "auto",
          boxShadow: "var(--shadow-pop)",
          borderColor: "var(--ink3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            padding: "22px 24px 0",
          }}
        >
          <div>
            {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
            {title && (
              <div className="serif" style={{ fontSize: 21, fontWeight: 600 }}>
                {title}
              </div>
            )}
          </div>
          <IconBtn name="close" onClick={onClose} />
        </div>
        <div style={{ padding: "18px 24px 24px" }}>{children}</div>
      </div>
    </div>
  );
}
