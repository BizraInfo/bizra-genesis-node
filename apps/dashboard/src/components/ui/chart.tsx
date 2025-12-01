import * as React from 'react'
import * as RechartsPrimitive from 'recharts'

import { cn } from '@/lib/utils'

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

type RechartsValue = number | string

/** Normalized tooltip entry with safe typed properties */
interface NormalizedTooltipEntry {
  dataKey: string | number
  name: string | number
  value: RechartsValue | null
  color?: string
  payload?: Record<string, unknown>
}

/** Normalized legend entry with safe typed properties */
interface NormalizedLegendEntry {
  dataKey?: string | number
  value?: string | number
  color?: string
}

const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
}

type ChartContextProps = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextProps | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />')
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<'div'> & {
  config: ChartConfig
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>['children']
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id || uniqueId.replace(/:/g, '')}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-surface]:outline-hidden",
          className,
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(([, itemConfig]) => itemConfig.theme || itemConfig.color)

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.theme?.[theme as keyof typeof itemConfig.theme] || itemConfig.color
    return color ? `  --color-${key}: ${color};` : null
  })
  .join('\n')}
}
`,
          )
          .join('\n'),
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Normalize raw recharts payload entry to typed structure */
const normalizeTooltipEntry = (entry: unknown): NormalizedTooltipEntry | null => {
  if (!isRecord(entry)) {
    return null
  }
  const dataKey = typeof entry.dataKey === 'string' || typeof entry.dataKey === 'number' 
    ? entry.dataKey 
    : 'value'
  const name = typeof entry.name === 'string' || typeof entry.name === 'number'
    ? entry.name
    : dataKey
  const value = typeof entry.value === 'string' || typeof entry.value === 'number'
    ? entry.value
    : null
  const color = typeof entry.color === 'string' ? entry.color : undefined
  const payload = isRecord(entry.payload) ? entry.payload : undefined

  return { dataKey, name, value, color, payload }
}

/** Normalize legend entry */
const normalizeLegendEntry = (entry: unknown): NormalizedLegendEntry | null => {
  if (!isRecord(entry)) {
    return null
  }
  return {
    dataKey: typeof entry.dataKey === 'string' || typeof entry.dataKey === 'number' 
      ? entry.dataKey 
      : undefined,
    value: typeof entry.value === 'string' || typeof entry.value === 'number'
      ? entry.value
      : undefined,
    color: typeof entry.color === 'string' ? entry.color : undefined
  }
}

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = 'dot',
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<'div'> & {
    hideLabel?: boolean
    hideIndicator?: boolean
    indicator?: 'line' | 'dot' | 'dashed'
    nameKey?: string
    labelKey?: string
  }) {
  const { config } = useChart()
  const normalizedPayload = React.useMemo(
    () => Array.isArray(payload) 
      ? payload.map(normalizeTooltipEntry).filter((e): e is NormalizedTooltipEntry => e !== null)
      : [],
    [payload],
  )

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || normalizedPayload.length === 0) {
      return null
    }

    const [item] = normalizedPayload
    const key = `${labelKey || item?.dataKey || item?.name || 'value'}`
    const itemConfig = getPayloadConfigFromPayload(config, item, key)
    const value = !labelKey && typeof label === 'string' ? config[label]?.label || label : itemConfig?.label

    if (labelFormatter) {
      // Cast to any to satisfy Recharts formatter type which expects Payload[]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <div className={cn('font-medium', labelClassName)}>{labelFormatter(value, normalizedPayload as any)}</div>
    }

    if (!value) {
      return null
    }

    return <div className={cn('font-medium', labelClassName)}>{value}</div>
  }, [hideLabel, normalizedPayload, labelKey, config, label, labelFormatter, labelClassName])

  if (!active || normalizedPayload.length === 0) {
    return null
  }

  const nestLabel = normalizedPayload.length === 1 && indicator !== 'dot'

  return (
    <div
      className={cn(
        'border-border/50 bg-background grid min-w-[8rem] items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl',
        className,
      )}
    >
      {!nestLabel ? tooltipLabel : null}
      <div className="grid gap-1.5">
        {normalizedPayload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || 'value'}`
          const itemConfig = getPayloadConfigFromPayload(config, item, key)
          const itemPayload = isRecord(item.payload) ? item.payload : undefined
          const indicatorColor =
            color ??
            (typeof itemPayload?.fill === 'string' ? itemPayload.fill : undefined) ??
            (typeof item.color === 'string' ? item.color : undefined)
          const value = typeof item.value === 'number' || typeof item.value === 'string' ? item.value : null
          const itemName =
            typeof item.name === 'string'
              ? item.name
              : typeof item.name === 'number'
                ? String(item.name)
                : String(item.dataKey ?? 'value')

          return (
            <div
              key={String(item.dataKey ?? index)}
              className={cn(
                '[&>svg]:text-muted-foreground flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5',
                indicator === 'dot' && 'items-center',
              )}
            >
              {formatter && value !== null ? (
                // Cast item to satisfy Recharts formatter which expects Payload type with 5 args
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                formatter(value, itemName, item as any, index, normalizedPayload as any)
              ) : (
                <>
                  {itemConfig?.icon ? (
                    <itemConfig.icon />
                  ) : (
                    !hideIndicator && (
                      <div
                        className={cn(
                          'shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)',
                          {
                            'h-2.5 w-2.5': indicator === 'dot',
                            'w-1': indicator === 'line',
                            'w-0 border-[1.5px] border-dashed bg-transparent': indicator === 'dashed',
                            'my-0.5': nestLabel && indicator === 'dashed',
                          },
                        )}
                        style={
                          {
                            '--color-bg': indicatorColor,
                            '--color-border': indicatorColor,
                          } as React.CSSProperties
                        }
                      />
                    )
                  )}
                  <div
                    className={cn(
                      'flex flex-1 justify-between leading-none',
                      nestLabel ? 'items-end' : 'items-center',
                    )}
                  >
                    <div className="grid gap-1.5">
                      {nestLabel ? tooltipLabel : null}
                      <span className="text-muted-foreground">
                        {itemConfig?.label || itemName}
                      </span>
                    </div>
                    {value !== null && (
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {typeof value === 'number' ? value.toLocaleString() : String(value)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const ChartLegend = RechartsPrimitive.Legend

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = 'bottom',
  nameKey,
}: React.ComponentProps<'div'> &
  Pick<RechartsPrimitive.LegendProps, 'payload' | 'verticalAlign'> & {
    hideIcon?: boolean
    nameKey?: string
  }) {
  const { config } = useChart()
  const legendPayload = React.useMemo(
    () => Array.isArray(payload)
      ? payload.map(normalizeLegendEntry).filter((e): e is NormalizedLegendEntry => e !== null)
      : [],
    [payload]
  )

  if (!legendPayload.length) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-4',
        verticalAlign === 'top' ? 'pb-3' : 'pt-3',
        className,
      )}
    >
      {legendPayload.map((item) => {
        const key = `${nameKey ?? item.dataKey ?? 'value'}`
        const itemConfig = getPayloadConfigFromPayload(config, item, key)
        const labelText = itemConfig?.label ?? item.value

        return (
          <div
            key={String(item.value ?? item.dataKey)}
            className="[&>svg]:text-muted-foreground flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3"
          >
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <div
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{
                  backgroundColor: item.color,
                }}
              />
            )}
            {labelText}
          </div>
        )
      })}
    </div>
  )
}

function getPayloadConfigFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (!isRecord(payload)) {
    return undefined
  }

  const payloadPayload = 'payload' in payload && isRecord((payload as Record<string, unknown>).payload)
    ? (payload as { payload: Record<string, unknown> }).payload
    : undefined

  let configLabelKey: string = key

  if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
    configLabelKey = payload[key as keyof typeof payload] as string
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
  ) {
    configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string
  }

  return configLabelKey in config ? config[configLabelKey] : config[key]
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
}
