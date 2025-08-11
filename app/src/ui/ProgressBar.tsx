import React from 'react'

export type StatVariant = 'hp' | 'mp'

export function ProgressBar({
  value,
  max,
  variant = 'hp',
  width = 120,
  height = 8,
  showLabel = false,
  className = '',
}: {
  value: number
  max: number
  variant?: StatVariant
  width?: number | string
  height?: number
  showLabel?: boolean
  className?: string
}) {
  const safeMax = Math.max(1, Math.floor(max || 0))
  const safeVal = Math.max(0, Math.min(safeMax, Math.floor(value || 0)))
  const pct = Math.round((safeVal / safeMax) * 100)
  const gradient = variant === 'hp'
    ? 'linear-gradient(90deg, #ef4444, #dc2626)'
    : 'linear-gradient(90deg, #60a5fa, #22d3ee)'
  const bg = 'rgba(0,0,0,0.15)'

  return (
    <div
      className={`statbar ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height,
        borderRadius: 6,
        background: bg,
        overflow: 'hidden',
      }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      title={`${variant.toUpperCase()}: ${safeVal}/${safeMax}`}
    >
      <div
        className="statbar-fill"
        style={{
          width: `${pct}%`,
          height: '100%',
          background: gradient,
          transition: 'width .25s ease',
        }}
      />
      {showLabel && (
        <div
          className="statbar-label"
          style={{ position: 'relative', marginTop: -height, height, fontSize: Math.max(10, height - 2), lineHeight: `${height}px`, color: '#fff', textAlign: 'center', textShadow: '0 1px 2px rgba(0,0,0,.5)' }}
        >
          {safeVal}/{safeMax}
        </div>
      )}
    </div>
  )
}


