// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - Formatters                                     ║
// ║  Utility functions for formatting data display                        ║
// ╚═══════════════════════════════════════════════════════════════════════╝

/**
 * Format a date to a human-readable string
 *
 * @example
 * formatDate(new Date()) // "Jan 15, 2025"
 * formatDate(new Date(), 'full') // "January 15, 2025 at 2:30 PM"
 * formatDate(new Date(), 'relative') // "2 hours ago"
 */
export function formatDate(
  date: Date | string | number,
  format: 'short' | 'medium' | 'long' | 'full' | 'relative' | 'time' = 'medium'
): string {
  const d = new Date(date)

  if (isNaN(d.getTime())) {
    return 'Invalid Date'
  }

  if (format === 'relative') {
    return formatRelativeTime(d)
  }

  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'short', day: 'numeric', year: 'numeric' },
    medium: { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
    long: { month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
    full: { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' },
    time: { hour: 'numeric', minute: '2-digit', second: '2-digit' }
  }
  const options = formatOptions[format]

  return d.toLocaleString('en-US', options)
}

/**
 * Format a relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)
  const diffYears = Math.floor(diffDays / 365)

  if (diffSeconds < 60) {return 'just now'}
  if (diffMinutes === 1) {return '1 minute ago'}
  if (diffMinutes < 60) {return `${diffMinutes} minutes ago`}
  if (diffHours === 1) {return '1 hour ago'}
  if (diffHours < 24) {return `${diffHours} hours ago`}
  if (diffDays === 1) {return 'yesterday'}
  if (diffDays < 7) {return `${diffDays} days ago`}
  if (diffWeeks === 1) {return '1 week ago'}
  if (diffWeeks < 4) {return `${diffWeeks} weeks ago`}
  if (diffMonths === 1) {return '1 month ago'}
  if (diffMonths < 12) {return `${diffMonths} months ago`}
  if (diffYears === 1) {return '1 year ago'}
  return `${diffYears} years ago`
}

/**
 * Format a number with abbreviations (K, M, B)
 *
 * @example
 * formatNumber(1234) // "1.2K"
 * formatNumber(1234567) // "1.2M"
 * formatNumber(1234567890) // "1.2B"
 */
export function formatNumber(
  num: number,
  decimals: number = 1
): string {
  if (num < 1000) {return num.toString()}

  const units = ['K', 'M', 'B', 'T']
  const order = Math.floor(Math.log10(Math.abs(num)) / 3)
  const unitIndex = order - 1

  if (unitIndex >= units.length) {
    return num.toExponential(decimals)
  }

  const value = num / Math.pow(1000, order)
  return `${value.toFixed(decimals)}${units[unitIndex]}`
}

/**
 * Format currency with proper symbols and decimals
 *
 * @example
 * formatCurrency(1234.56) // "$1,234.56"
 * formatCurrency(1234.56, 'EUR') // "€1,234.56"
 * formatCurrency(1234567.89, 'USD', true) // "$1.2M"
 */
export function formatCurrency(
  amount: number,
  currency: 'USD' | 'EUR' | 'GBP' | 'JPY' | 'TZT' = 'USD',
  compact: boolean = false
): string {
  if (compact && Math.abs(amount) >= 1000) {
    const formatted = formatNumber(amount, 1)
    const symbol = { USD: '$', EUR: '€', GBP: '£', JPY: '¥', TZT: 'TZT' }[currency]
    return `${symbol}${formatted}`
  }

  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'TZT' ? 'USD' : currency,
    minimumFractionDigits: currency === 'JPY' ? 0 : 2,
    maximumFractionDigits: currency === 'JPY' ? 0 : 2
  })

  const formatted = formatter.format(amount)

  // Replace USD with TZT for custom currency
  if (currency === 'TZT') {
    return formatted.replace('$', 'TZT ')
  }

  return formatted
}

/**
 * Format file size in bytes to human-readable string
 *
 * @example
 * formatBytes(1234) // "1.2 KB"
 * formatBytes(1234567) // "1.2 MB"
 * formatBytes(1234567890) // "1.1 GB"
 */
export function formatBytes(
  bytes: number,
  decimals: number = 1
): string {
  if (bytes === 0) {return '0 Bytes'}

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  const value = bytes / Math.pow(k, i)
  return `${value.toFixed(decimals)} ${sizes[i]}`
}

/**
 * Format duration in milliseconds to human-readable string
 *
 * @example
 * formatDuration(1500) // "1.5s"
 * formatDuration(65000) // "1m 5s"
 * formatDuration(3665000) // "1h 1m 5s"
 */
export function formatDuration(
  ms: number,
  format: 'short' | 'long' = 'short'
): string {
  if (ms < 1000) {return `${ms}ms`}

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (format === 'long') {
    const parts: string[] = []
    if (days > 0) {parts.push(`${days} day${days > 1 ? 's' : ''}`)}
    if (hours % 24 > 0) {parts.push(`${hours % 24} hour${hours % 24 > 1 ? 's' : ''}`)}
    if (minutes % 60 > 0) {parts.push(`${minutes % 60} minute${minutes % 60 > 1 ? 's' : ''}`)}
    if (seconds % 60 > 0) {parts.push(`${seconds % 60} second${seconds % 60 > 1 ? 's' : ''}`)}
    return parts.join(', ')
  }

  if (days > 0) {return `${days}d ${hours % 24}h`}
  if (hours > 0) {return `${hours}h ${minutes % 60}m`}
  if (minutes > 0) {return `${minutes}m ${seconds % 60}s`}
  return `${seconds}s`
}

/**
 * Truncate text to a maximum length with ellipsis
 *
 * @example
 * truncateText('Hello World', 5) // "Hello..."
 * truncateText('Hello World', 20) // "Hello World"
 */
export function truncateText(
  text: string,
  maxLength: number,
  suffix: string = '...'
): string {
  if (text.length <= maxLength) {return text}
  return text.slice(0, maxLength - suffix.length) + suffix
}

/**
 * Format percentage with proper decimals
 *
 * @example
 * formatPercentage(0.1234) // "12.3%"
 * formatPercentage(0.1234, 1) // "12.3%"
 * formatPercentage(0.1234, 0) // "12%"
 */
export function formatPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${(value * 100).toFixed(decimals)}%`
}

/**
 * Format phone number to (XXX) XXX-XXXX format
 *
 * @example
 * formatPhoneNumber('1234567890') // "(123) 456-7890"
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)

  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }

  return phone
}

/**
 * Format name to title case
 *
 * @example
 * formatName('john doe') // "John Doe"
 * formatName('JANE SMITH') // "Jane Smith"
 */
export function formatName(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Format API key or secret with masking
 *
 * @example
 * formatSecret('sk_live_1234567890abcdef') // "sk_live_••••••••••••cdef"
 * formatSecret('password123', 3) // "pas••••••••123"
 */
export function formatSecret(
  secret: string,
  visibleChars: number = 4
): string {
  if (secret.length <= visibleChars * 2) {
    return '•'.repeat(secret.length)
  }

  const start = secret.slice(0, visibleChars)
  const end = secret.slice(-visibleChars)
  const masked = '•'.repeat(secret.length - visibleChars * 2)

  return `${start}${masked}${end}`
}
