const STATES = {
  disconnected: { label: 'Desconectado', tone: 'neutral' },
  connecting: { label: 'Conectando', tone: 'warning' },
  connected: { label: 'Conectado', tone: 'success' },
  demo: { label: 'Demo', tone: 'demo' },
  error: { label: 'Error', tone: 'danger' }
}

export default function StatusBadge({ state = 'disconnected' }) {
  const info = STATES[state] ?? STATES.disconnected

  return (
    <span className={`status-badge status-badge--${info.tone}`}>
      <span className="status-badge__dot" />
      {info.label}
    </span>
  )
}
