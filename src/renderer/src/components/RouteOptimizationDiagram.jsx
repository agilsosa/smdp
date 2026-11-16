import { useState } from 'react'
import { ROUTE_NODES, ROUTE_LINKS } from '../lib/city-simulation'

export default function RouteOptimizationDiagram() {
  const [routeMode, setRouteMode] = useState('traffic') // 'traffic' | 'waste'
  const [selectedNode, setSelectedNode] = useState(null)

  return (
    <div className="route-opt-panel">
      {/* Header with Short Title & Compact Mode Switcher */}
      <div className="route-opt-header">
        <div className="route-opt-title-block">
          <div className="icon-badge">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              width="14"
              height="14"
            >
              <circle cx="6" cy="19" r="3" />
              <path d="M9 19h8.5a4.5 4.5 0 0 0 0-9H5" />
              <polyline points="8 6 5 9 8 12" />
            </svg>
          </div>
          <h4 className="route-opt-title">RUTAS Y TRÁFICO</h4>
        </div>

        <div className="route-opt-modes">
          <button
            type="button"
            className={`route-mode-btn ${routeMode === 'traffic' ? 'route-mode-btn--active' : ''}`}
            onClick={() => setRouteMode('traffic')}
          >
            🚦 Tráfico
          </button>
          <button
            type="button"
            className={`route-mode-btn ${routeMode === 'waste' ? 'route-mode-btn--active' : ''}`}
            onClick={() => setRouteMode('waste')}
          >
            ♻️ Residuos
          </button>
        </div>
      </div>

      {/* Main Topological SVG Graph */}
      <div className="route-graph-viewport">
        <svg viewBox="0 0 360 180" className="route-svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <linearGradient id="linkGradOptimal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id="linkGradSecondary" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(56, 189, 248, 0.25)" />
              <stop offset="100%" stopColor="rgba(37, 99, 235, 0.25)" />
            </linearGradient>
            <filter id="blueGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Map Grid */}
          <pattern id="gridPattern" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke="rgba(14, 165, 233, 0.08)"
              strokeWidth="1"
            />
          </pattern>
          <rect width="360" height="180" fill="url(#gridPattern)" />

          {/* Connection Links */}
          {ROUTE_LINKS.map((link, idx) => {
            const fromNode = ROUTE_NODES.find((n) => n.id === link.from)
            const toNode = ROUTE_NODES.find((n) => n.id === link.to)
            if (!fromNode || !toNode) return null

            const isOptimal = link.optimal
            return (
              <g key={`link-${idx}`}>
                {isOptimal && (
                  <line
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke="#0ea5e9"
                    strokeWidth="4"
                    strokeOpacity="0.25"
                    filter="url(#blueGlow)"
                  />
                )}
                <line
                  x1={fromNode.x}
                  y1={fromNode.y}
                  x2={toNode.x}
                  y2={toNode.y}
                  stroke={isOptimal ? 'url(#linkGradOptimal)' : 'url(#linkGradSecondary)'}
                  strokeWidth={isOptimal ? 2 : 1.2}
                  strokeDasharray={isOptimal ? '5 3' : '2 2'}
                  className={isOptimal ? 'animated-route-dash' : ''}
                />
                <text
                  x={(fromNode.x + toNode.x) / 2}
                  y={(fromNode.y + toNode.y) / 2 - 4}
                  fill="rgba(148, 163, 184, 0.65)"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {link.distance}
                </text>
              </g>
            )
          })}

          {/* Topological Nodes */}
          {ROUTE_NODES.map((node) => {
            const isSelected = selectedNode?.id === node.id
            const isHub = node.type === 'hub'

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNode(node)}
                style={{ cursor: 'pointer' }}
              >
                {(isHub || isSelected) && (
                  <circle
                    r={isHub ? 14 : 11}
                    fill="none"
                    stroke="#38bdf8"
                    strokeWidth="1.2"
                    strokeOpacity="0.5"
                    className="node-pulse-ring"
                  />
                )}

                <circle
                  r={isHub ? 9 : 6.5}
                  fill="#000000"
                  stroke={isSelected ? '#00f0ff' : isHub ? '#38bdf8' : '#0ea5e9'}
                  strokeWidth="1.8"
                  filter="url(#blueGlow)"
                />

                <circle r={isHub ? 3.5 : 2.5} fill={isSelected ? '#00f0ff' : '#60a5fa'} />

                {/* Node Label positioned with safe margins */}
                <text
                  y={node.y > 100 ? 15 : -10}
                  fill={isSelected ? '#00f0ff' : '#f8fafc'}
                  fontSize="8.5"
                  fontWeight={isHub ? '700' : '500'}
                  fontFamily="sans-serif"
                  textAnchor="middle"
                >
                  {node.name}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Metrics Footer Bar */}
      <div className="route-opt-footer-bar">
        <div className="route-chip-metric">
          <span className="route-chip-lbl">Tiempo:</span>
          <span className="route-chip-val route-chip-val--cyan">-24.6%</span>
        </div>
        <div className="route-chip-metric">
          <span className="route-chip-lbl">CO₂:</span>
          <span className="route-chip-val route-chip-val--blue">-18.2%</span>
        </div>
        <div className="route-chip-metric">
          <span className="route-chip-lbl">Algoritmo:</span>
          <span className="route-chip-val">GNN Dijkstra</span>
        </div>
        <div className="route-chip-path">
          <span className="route-chip-lbl">Ruta:</span>
          <span className="route-path-text">
            {routeMode === 'traffic'
              ? 'Nodo Norte ➔ Hub ➔ Eco-Planta'
              : 'Eco-Planta ➔ Nodo Sur ➔ Puerto'}
          </span>
        </div>
      </div>
    </div>
  )
}
