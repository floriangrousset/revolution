export function Seal({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ flex: "0 0 auto" }}>
      <circle cx="24" cy="24" r="22.5" stroke="var(--gold)" strokeWidth="1.2" opacity="0.7" />
      <circle cx="24" cy="24" r="19" stroke="var(--gold-deep)" strokeWidth="0.8" opacity="0.6" />
      <path d="M24 11c-5 0-8 4-8 4h16s-3-4-8-4z" fill="var(--gold)" opacity="0.9" />
      <rect x="15" y="15" width="18" height="2" rx="1" fill="var(--gold)" />
      <path d="M17 17v11M21 17v11M27 17v11M31 17v11" stroke="var(--gold)" strokeWidth="1.6" />
      <rect x="14" y="28" width="20" height="2.4" rx="1" fill="var(--gold)" />
      <path d="M24 6v3M24 8l1.6 1.2L24 6l-1.6 3.2z" fill="var(--gold-bright)" />
      <circle cx="24" cy="6.5" r="1.5" fill="var(--gold-bright)" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <Seal size={compact ? 30 : 36} />
      {!compact && (
        <div style={{ lineHeight: 1 }}>
          <div
            className="serif"
            style={{ fontSize: 21, fontWeight: 600, letterSpacing: ".01em", color: "var(--txt)" }}
          >
            Revolution
          </div>
          <div
            style={{
              fontSize: 9.5,
              letterSpacing: ".26em",
              textTransform: "uppercase",
              color: "var(--gold)",
              marginTop: 3,
              fontWeight: 600,
            }}
          >
            Deliberation Engine
          </div>
        </div>
      )}
    </div>
  );
}
