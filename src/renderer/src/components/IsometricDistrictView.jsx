import { useEffect, useRef, useState } from 'react'

const BUILDINGS = [
  // x, y, width, depth, height, label, type, sensorKey
  {
    x: -140,
    y: -90,
    w: 46,
    d: 46,
    h: 120,
    label: 'Torre Metropolitan A',
    type: 'tower',
    sensorKey: 'energia'
  },
  {
    x: -80,
    y: -90,
    w: 40,
    d: 40,
    h: 80,
    label: 'Centro Financiero Tech',
    type: 'commercial',
    sensorKey: null
  },
  {
    x: -140,
    y: -30,
    w: 50,
    d: 38,
    h: 65,
    label: 'Subestación Central 01',
    type: 'energy',
    sensorKey: 'energia'
  },
  {
    x: -75,
    y: -35,
    w: 42,
    d: 42,
    h: 145,
    label: 'Torre Spire Metropolitana',
    type: 'landmark',
    sensorKey: 'aire'
  },
  {
    x: -10,
    y: -95,
    w: 45,
    d: 45,
    h: 90,
    label: 'Campus Inteligente',
    type: 'corporate',
    sensorKey: null
  },
  {
    x: -10,
    y: -35,
    w: 45,
    d: 45,
    h: 110,
    label: 'Torre Atmosférica Central',
    type: 'air_node',
    sensorKey: 'aire'
  },
  {
    x: 55,
    y: -85,
    w: 50,
    d: 40,
    h: 70,
    label: 'Complejo Residencial Norte',
    type: 'residential',
    sensorKey: 'agua'
  },
  {
    x: 55,
    y: -30,
    w: 50,
    d: 42,
    h: 85,
    label: 'Hub Conectividad 5G',
    type: 'tech',
    sensorKey: null
  },
  {
    x: 120,
    y: -65,
    w: 45,
    d: 45,
    h: 55,
    label: 'Planta de Agua & Reservas',
    type: 'water_node',
    sensorKey: 'agua'
  },
  {
    x: -140,
    y: 35,
    w: 45,
    d: 45,
    h: 75,
    label: 'Distrito Cívico & Datos',
    type: 'civic',
    sensorKey: null
  },
  {
    x: -80,
    y: 40,
    w: 44,
    d: 44,
    h: 95,
    label: 'Intercambiador Tráfico Sur',
    type: 'transit',
    sensorKey: 'trafico'
  },
  {
    x: -15,
    y: 40,
    w: 48,
    d: 45,
    h: 130,
    label: 'Torre Bicentenario Sur',
    type: 'tower',
    sensorKey: null
  },
  {
    x: 55,
    y: 35,
    w: 45,
    d: 45,
    h: 60,
    label: 'Planta Reciclaje Inteligente',
    type: 'waste_node',
    sensorKey: 'residuos'
  },
  {
    x: 120,
    y: 15,
    w: 45,
    d: 45,
    h: 45,
    label: 'Terminal Logístico Portuario',
    type: 'port',
    sensorKey: 'residuos'
  }
]

const SENSOR_NODES = [
  {
    id: 'energia',
    label: 'Nodo Energía Subestación',
    x: -115,
    y: -11,
    z: 65,
    color: '#38bdf8',
    category: 'energia'
  },
  {
    id: 'agua',
    label: 'Estación Hidráulica Acuífero',
    x: 142,
    y: -42,
    z: 55,
    color: '#0ea5e9',
    category: 'agua'
  },
  {
    id: 'aire',
    label: 'Sensor Atmosférico Spire',
    x: -54,
    y: -14,
    z: 145,
    color: '#60a5fa',
    category: 'aire'
  },
  {
    id: 'trafico',
    label: 'Sensor Flujo Vial Central',
    x: -58,
    y: 62,
    z: 20,
    color: '#2563eb',
    category: 'trafico'
  },
  {
    id: 'residuos',
    label: 'Nodo IoT Reciclaje Eco',
    x: 77,
    y: 57,
    z: 60,
    color: '#93c5fd',
    category: 'residuos'
  }
]

export default function IsometricDistrictView({ telemetry = {}, onSelectSensor }) {
  const canvasRef = useRef(null)
  const [activeLayer, setActiveLayer] = useState('all') // all, energia, agua, aire, trafico, residuos
  const [zoom, setZoom] = useState(0.95)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [hoveredPos, setHoveredPos] = useState({ x: 0, y: 0 })
  const animationFrameRef = useRef(null)
  const tickRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let running = true

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    resize()
    window.addEventListener('resize', resize)

    const ro = new ResizeObserver(() => {
      resize()
    })
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    // Isometric projection: 30 degrees
    const isoAngle = Math.PI / 6 // 30 deg
    const cosA = Math.cos(isoAngle)
    const sinA = Math.sin(isoAngle)

    const project = (x, y, z, cx, cy) => {
      const px = cx + (x - y) * cosA * zoom
      const py = cy + (x + y) * sinA * zoom - z * zoom
      return { x: px, y: py }
    }

    const render = () => {
      if (!running) return
      tickRef.current += 1
      const tick = tickRef.current

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      const cx = width / 2
      const cy = height / 2 + 18

      ctx.clearRect(0, 0, width, height)

      // Background subtle gradient
      const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, width * 0.7)
      bgGrad.addColorStop(0, 'rgba(8, 20, 48, 0.5)')
      bgGrad.addColorStop(0.6, 'rgba(4, 9, 22, 0.7)')
      bgGrad.addColorStop(1, 'rgba(2, 4, 10, 0.95)')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // 1. Draw isometric ground grid lines
      const gridSize = 240
      const step = 30
      ctx.lineWidth = 1
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.12)'

      for (let x = -gridSize; x <= gridSize; x += step) {
        const p1 = project(x, -gridSize, 0, cx, cy)
        const p2 = project(x, gridSize, 0, cx, cy)
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }

      for (let y = -gridSize; y <= gridSize; y += step) {
        const p1 = project(-gridSize, y, 0, cx, cy)
        const p2 = project(gridSize, y, 0, cx, cy)
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }

      // 2. Draw Waterway (Canal Hídrico / Bahía)
      if (activeLayer === 'all' || activeLayer === 'agua') {
        const wP1 = project(90, -gridSize, -2, cx, cy)
        const wP2 = project(170, -gridSize, -2, cx, cy)
        const wP3 = project(170, gridSize, -2, cx, cy)
        const wP4 = project(90, gridSize, -2, cx, cy)

        ctx.fillStyle = 'rgba(14, 165, 233, 0.22)'
        ctx.beginPath()
        ctx.moveTo(wP1.x, wP1.y)
        ctx.lineTo(wP2.x, wP2.y)
        ctx.lineTo(wP3.x, wP3.y)
        ctx.lineTo(wP4.x, wP4.y)
        ctx.closePath()
        ctx.fill()

        // Animated water pulse lines
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)'
        ctx.lineWidth = 1.5
        for (let i = 0; i < 4; i++) {
          const shift = ((tick * 0.8 + i * 50) % 360) - 180
          const wpA = project(105, shift, -1, cx, cy)
          const wpB = project(155, shift + 30, -1, cx, cy)
          ctx.beginPath()
          ctx.moveTo(wpA.x, wpA.y)
          ctx.lineTo(wpB.x, wpB.y)
          ctx.stroke()
        }
      }

      // 3. Draw Smart Transit Arteries & Traffic Pulses
      if (activeLayer === 'all' || activeLayer === 'trafico') {
        const roads = [
          { from: [-200, 10], to: [200, 10] },
          { from: [-25, -200], to: [-25, 200] },
          { from: [-100, -150], to: [-100, 150] }
        ]

        ctx.lineWidth = 3
        ctx.strokeStyle = 'rgba(37, 99, 235, 0.45)'
        roads.forEach((road) => {
          const r1 = project(road.from[0], road.from[1], 1, cx, cy)
          const r2 = project(road.to[0], road.to[1], 1, cx, cy)
          ctx.beginPath()
          ctx.moveTo(r1.x, r1.y)
          ctx.lineTo(r2.x, r2.y)
          ctx.stroke()
        })

        // Moving traffic pulses
        for (let i = 0; i < 6; i++) {
          const tPos = ((tick * 1.5 + i * 65) % 400) - 200
          const car1 = project(tPos, 10, 2, cx, cy)
          ctx.fillStyle = '#60a5fa'
          ctx.shadowColor = '#38bdf8'
          ctx.shadowBlur = 8
          ctx.beginPath()
          ctx.arc(car1.x, car1.y, 3 * zoom, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }

        for (let i = 0; i < 4; i++) {
          const tPos = ((tick * 1.2 + i * 90) % 360) - 180
          const car2 = project(-25, tPos, 2, cx, cy)
          ctx.fillStyle = '#93c5fd'
          ctx.shadowColor = '#00f0ff'
          ctx.shadowBlur = 6
          ctx.beginPath()
          ctx.arc(car2.x, car2.y, 2.8 * zoom, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      }

      // 4. Draw Energy conduits
      if (activeLayer === 'all' || activeLayer === 'energia') {
        const powerLines = [
          { from: [-140, -30], to: [-75, -35] },
          { from: [-75, -35], to: [-15, 40] },
          { from: [-140, -90], to: [-140, -30] }
        ]

        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.lineDashOffset = -tick * 0.7
        ctx.strokeStyle = '#38bdf8'
        powerLines.forEach((line) => {
          const p1 = project(line.from[0], line.from[1], 15, cx, cy)
          const p2 = project(line.to[0], line.to[1], 25, cx, cy)
          ctx.beginPath()
          ctx.moveTo(p1.x, p1.y)
          ctx.lineTo(p2.x, p2.y)
          ctx.stroke()
        })
        ctx.setLineDash([])
      }

      // 5. Draw 3D Isometric Buildings (sorted back to front)
      const sortedBuildings = [...BUILDINGS].sort((a, b) => {
        return a.x + a.y - (b.x + b.y)
      })

      sortedBuildings.forEach((b) => {
        const { x, y, w, d, h } = b

        // Corners in isometric space
        const p0 = project(x, y, 0, cx, cy)
        const p2 = project(x + w, y + d, 0, cx, cy)
        const p3 = project(x, y + d, 0, cx, cy)

        const top0 = project(x, y, h, cx, cy)
        const top1 = project(x + w, y, h, cx, cy)
        const top2 = project(x + w, y + d, h, cx, cy)
        const top3 = project(x, y + d, h, cx, cy)

        // Building highlight logic based on activeLayer
        const isHighlighted = activeLayer === 'all' || (b.sensorKey && activeLayer === b.sensorKey)
        const opacity = isHighlighted ? 1 : 0.35

        // Left Face (X axis)
        ctx.fillStyle = `rgba(11, 25, 55, ${0.9 * opacity})`
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.28 * opacity})`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(p0.x, p0.y)
        ctx.lineTo(p3.x, p3.y)
        ctx.lineTo(top3.x, top3.y)
        ctx.lineTo(top0.x, top0.y)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Right Face (Y axis)
        ctx.fillStyle = `rgba(6, 16, 38, ${0.92 * opacity})`
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.35 * opacity})`
        ctx.beginPath()
        ctx.moveTo(p3.x, p3.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.lineTo(top2.x, top2.y)
        ctx.lineTo(top3.x, top3.y)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Top Face (Roof)
        ctx.fillStyle = `rgba(18, 48, 96, ${0.85 * opacity})`
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.6 * opacity})`
        ctx.beginPath()
        ctx.moveTo(top0.x, top0.y)
        ctx.lineTo(top1.x, top1.y)
        ctx.lineTo(top2.x, top2.y)
        ctx.lineTo(top3.x, top3.y)
        ctx.closePath()
        ctx.fill()
        ctx.stroke()

        // Draw Lit Windows / Matrix Lines on Faces
        if (h > 40 && isHighlighted) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.45)'
          const stories = Math.floor(h / 15)
          for (let s = 1; s < stories; s++) {
            const zh = s * 15
            const w1 = project(x + w * 0.25, y + d, zh, cx, cy)
            const w2 = project(x + w * 0.75, y + d, zh, cx, cy)
            ctx.beginPath()
            ctx.arc(w1.x, w1.y, 1.2 * zoom, 0, Math.PI * 2)
            ctx.arc(w2.x, w2.y, 1.2 * zoom, 0, Math.PI * 2)
            ctx.fill()
          }
        }

        // Antenna or Spire for Landmark Towers
        if (b.type === 'landmark' || b.type === 'air_node') {
          const spireBase = project(x + w / 2, y + d / 2, h, cx, cy)
          const spireTip = project(x + w / 2, y + d / 2, h + 30, cx, cy)
          ctx.strokeStyle = '#38bdf8'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(spireBase.x, spireBase.y)
          ctx.lineTo(spireTip.x, spireTip.y)
          ctx.stroke()

          // Pulsing Beacon on Spire Tip
          const pulse = (Math.sin(tick * 0.1) + 1) / 2
          ctx.fillStyle = '#00f0ff'
          ctx.shadowColor = '#00f0ff'
          ctx.shadowBlur = 10 * pulse + 4
          ctx.beginPath()
          ctx.arc(spireTip.x, spireTip.y, (2 + pulse * 2.5) * zoom, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
        }
      })

      // 6. Draw Sensor Beacons & Holographic Rings
      SENSOR_NODES.forEach((node) => {
        if (activeLayer !== 'all' && activeLayer !== node.category) return

        const pos = project(node.x, node.y, node.z, cx, cy)
        const pulse = (tick % 70) / 70
        const ringRadius = (8 + pulse * 24) * zoom

        // Beacon radar rings
        ctx.strokeStyle = node.color
        ctx.lineWidth = 1.2
        ctx.globalAlpha = Math.max(0, 1 - pulse)
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, ringRadius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1

        // Center beacon core
        ctx.fillStyle = node.color
        ctx.shadowColor = node.color
        ctx.shadowBlur = 12
        ctx.beginPath()
        ctx.arc(pos.x, pos.y, 4.5 * zoom, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        // Vertical holographic beam
        const groundPos = project(node.x, node.y, 0, cx, cy)
        ctx.strokeStyle = `rgba(56, 189, 248, 0.3)`
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(groundPos.x, groundPos.y)
        ctx.lineTo(pos.x, pos.y)
        ctx.stroke()
      })

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      running = false
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
      window.removeEventListener('resize', resize)
      ro.disconnect()
    }
  }, [zoom, activeLayer])

  // Mouse move handler for interactive tooltips
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const cx = canvas.clientWidth / 2
    const cy = canvas.clientHeight / 2 + 18
    const cosA = Math.cos(Math.PI / 6)
    const sinA = Math.sin(Math.PI / 6)

    let found = null
    for (const node of SENSOR_NODES) {
      const px = cx + (node.x - node.y) * cosA * zoom
      const py = cy + (node.x + node.y) * sinA * zoom - node.z * zoom
      const dist = Math.hypot(mouseX - px, mouseY - py)
      if (dist < 26) {
        found = node
        break
      }
    }

    if (found) {
      setHoveredNode(found)
      setHoveredPos({ x: mouseX, y: mouseY })
    } else {
      setHoveredNode(null)
    }
  }

  const handleCanvasClick = () => {
    if (hoveredNode && onSelectSensor) {
      onSelectSensor(hoveredNode.category)
    }
  }

  return (
    <div className="iso-district-panel">
      {/* Top Controls Overlay */}
      <div className="iso-header-overlay">
        <div className="iso-title-group">
          <div className="iso-badge">
            <span className="pulse-dot pulse-dot--cyan" />
            VISTA 3D
          </div>
          <span className="iso-dist-name">Distrito Central</span>
        </div>

        {/* Layer Filters */}
        <div className="iso-layer-filters">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'energia', label: '⚡ Energía' },
            { id: 'agua', label: '💧 Agua' },
            { id: 'aire', label: '💨 Aire' },
            { id: 'trafico', label: '🚦 Tráfico' },
            { id: 'residuos', label: '♻️ Residuos' }
          ].map((layer) => (
            <button
              key={layer.id}
              type="button"
              className={`iso-layer-btn ${activeLayer === layer.id ? 'iso-layer-btn--active' : ''}`}
              onClick={() => setActiveLayer(layer.id)}
            >
              {layer.label}
            </button>
          ))}
        </div>

        {/* Zoom Controls */}
        <div className="iso-zoom-group">
          <button
            type="button"
            className="iso-ctrl-btn"
            onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
            title="Acercar (+)"
          >
            +
          </button>
          <button
            type="button"
            className="iso-ctrl-btn"
            onClick={() => setZoom((z) => Math.max(0.7, z - 0.15))}
            title="Alejar (-)"
          >
            −
          </button>
          <button
            type="button"
            className="iso-ctrl-btn"
            onClick={() => setZoom(1.1)}
            title="Restablecer vista"
          >
            ⟲
          </button>
        </div>
      </div>

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        className="iso-canvas"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredNode(null)}
        onClick={handleCanvasClick}
      />

      {/* Floating HUD Tooltip */}
      {hoveredNode && (
        <div
          className="iso-hud-tooltip"
          style={{
            left: `${hoveredPos.x + 14}px`,
            top: `${hoveredPos.y - 45}px`
          }}
        >
          <div className="iso-hud-header">
            <span className="iso-hud-dot" style={{ background: hoveredNode.color }} />
            <span className="iso-hud-title">{hoveredNode.label}</span>
          </div>
          <div className="iso-hud-body">
            <div className="iso-hud-val">
              {telemetry[hoveredNode.category]?.value ?? '—'}{' '}
              <span className="iso-hud-unit">{telemetry[hoveredNode.category]?.unit || ''}</span>
            </div>
            <span className="iso-hud-status">
              {telemetry[hoveredNode.category]?.status || 'Estado Nominal · Supervisado'}
            </span>
          </div>
          <div className="iso-hud-action">Click para inspeccionar flujo</div>
        </div>
      )}

      {/* Bottom Telemetry Strip */}
      <div className="iso-bottom-strip">
        <div className="iso-stat-node">
          <span className="iso-stat-lbl">SECTOR</span>
          <span className="iso-stat-val">METRO-01</span>
        </div>
        <div className="iso-stat-node">
          <span className="iso-stat-lbl">NODOS ACTIVOS</span>
          <span className="iso-stat-val">14 / 14</span>
        </div>
        <div className="iso-stat-node">
          <span className="iso-stat-lbl">LATENCIA RED</span>
          <span className="iso-stat-val">6 ms</span>
        </div>
        <div className="iso-stat-node">
          <span className="iso-stat-lbl">ESTADO METRÓPOLI</span>
          <span className="iso-stat-val iso-stat-val--good">99.8% NOMINAL</span>
        </div>
      </div>
    </div>
  )
}
