export default function Sparkline({ values, color, width = 150, height = 44 }) {
  if (!Array.isArray(values) || values.length < 2) {
    return <div className="sparkline sparkline--empty" aria-hidden="true" />
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const step = width / (values.length - 1)
  const padding = 4

  const points = values
    .map((value, index) => {
      const x = index * step
      const y = height - padding - ((value - min) / span) * (height - padding * 2)
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const lastX = (values.length - 1) * step
  const lastY =
    height - padding - ((values[values.length - 1] - min) / span) * (height - padding * 2)

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Tendencia reciente del sensor"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={lastX} cy={lastY} r="2.6" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
