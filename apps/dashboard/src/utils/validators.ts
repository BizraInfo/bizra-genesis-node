// ╔═══════════════════════════════════════════════════════════════════════╗
// ║  BIZRA GENESIS NODE - Validators                                     ║
// ║  Utility functions for data validation                                ║
// ╚═══════════════════════════════════════════════════════════════════════╝

/**
 * Validate email address
 *
 * @example
 * validateEmail('user@example.com') // true
 * validateEmail('invalid-email') // false
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 * Returns an object with validation results and strength score
 *
 * @example
 * validatePassword('weak') // { valid: false, score: 20, errors: [...] }
 * validatePassword('StrongP@ss123') // { valid: true, score: 100, errors: [] }
 */
export interface PasswordValidation {
  valid: boolean
  score: number
  errors: string[]
  strength: 'weak' | 'fair' | 'good' | 'strong' | 'very strong'
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = []
  let score = 0

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  } else {
    score += 25
    if (password.length >= 12) {score += 10}
    if (password.length >= 16) {score += 10}
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  } else {
    score += 15
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  } else {
    score += 15
  }

  // Number check
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  } else {
    score += 15
  }

  // Special character check
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  } else {
    score += 20
  }

  // Determine strength
  let strength: PasswordValidation['strength']
  if (score < 40) {strength = 'weak'}
  else if (score < 60) {strength = 'fair'}
  else if (score < 80) {strength = 'good'}
  else if (score < 95) {strength = 'strong'}
  else {strength = 'very strong'}

  return {
    valid: errors.length === 0,
    score,
    errors,
    strength
  }
}

/**
 * Validate URL format
 *
 * @example
 * validateURL('https://example.com') // true
 * validateURL('not-a-url') // false
 */
export function validateURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * Validate JSON string
 *
 * @example
 * validateJSON('{"key": "value"}') // true
 * validateJSON('invalid json') // false
 */
export function validateJSON(jsonString: string): boolean {
  try {
    JSON.parse(jsonString)
    return true
  } catch {
    return false
  }
}

/**
 * Validate phone number (US format)
 *
 * @example
 * validatePhoneNumber('(123) 456-7890') // true
 * validatePhoneNumber('123-456-7890') // true
 * validatePhoneNumber('invalid') // false
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length === 10 || cleaned.length === 11
}

/**
 * Validate credit card number using Luhn algorithm
 *
 * @example
 * validateCreditCard('4532015112830366') // true
 * validateCreditCard('1234567890123456') // false
 */
export function validateCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\s/g, '')

  if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
    return false
  }

  // Luhn algorithm
  let sum = 0
  let isEven = false

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10)

    if (isEven) {
      digit *= 2
      if (digit > 9) {digit -= 9}
    }

    sum += digit
    isEven = !isEven
  }

  return sum % 10 === 0
}

/**
 * Validate username (alphanumeric, underscore, hyphen)
 *
 * @example
 * validateUsername('user_name-123') // true
 * validateUsername('user@name') // false
 */
export function validateUsername(username: string): boolean {
  const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/
  return usernameRegex.test(username)
}

/**
 * Validate hex color code
 *
 * @example
 * validateHexColor('#ff0000') // true
 * validateHexColor('#f00') // true
 * validateHexColor('red') // false
 */
export function validateHexColor(color: string): boolean {
  const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
  return hexRegex.test(color)
}

/**
 * Validate date string
 *
 * @example
 * validateDate('2025-01-15') // true
 * validateDate('invalid-date') // false
 */
export function validateDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

/**
 * Validate age range
 *
 * @example
 * validateAge(25, 18, 65) // true
 * validateAge(15, 18, 65) // false
 */
export function validateAge(age: number, min: number = 0, max: number = 150): boolean {
  return age >= min && age <= max
}

/**
 * Validate IPv4 address
 *
 * @example
 * validateIPv4('192.168.1.1') // true
 * validateIPv4('256.1.1.1') // false
 */
export function validateIPv4(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  return ipv4Regex.test(ip)
}

/**
 * Validate file extension
 *
 * @example
 * validateFileExtension('document.pdf', ['.pdf', '.doc']) // true
 * validateFileExtension('image.jpg', ['.pdf', '.doc']) // false
 */
export function validateFileExtension(filename: string, allowedExtensions: string[]): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return allowedExtensions.map(e => e.toLowerCase()).includes(ext)
}

/**
 * Validate file size (in bytes)
 *
 * @example
 * validateFileSize(1024 * 1024, 5 * 1024 * 1024) // true (1MB < 5MB)
 * validateFileSize(10 * 1024 * 1024, 5 * 1024 * 1024) // false (10MB > 5MB)
 */
export function validateFileSize(fileSize: number, maxSize: number): boolean {
  return fileSize <= maxSize
}

/**
 * Validate required fields in an object
 *
 * @example
 * validateRequiredFields({ name: 'John', email: 'john@example.com' }, ['name', 'email']) // { valid: true, missing: [] }
 * validateRequiredFields({ name: 'John' }, ['name', 'email']) // { valid: false, missing: ['email'] }
 */
export function validateRequiredFields<T extends Record<string, any>>(
  obj: T,
  requiredFields: (keyof T)[]
): { valid: boolean; missing: (keyof T)[] } {
  const missing = requiredFields.filter(field => !obj[field])

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Validate string length
 *
 * @example
 * validateLength('hello', 3, 10) // true
 * validateLength('hi', 3, 10) // false
 */
export function validateLength(
  str: string,
  min: number,
  max: number = Infinity
): boolean {
  return str.length >= min && str.length <= max
}

/**
 * Validate number range
 *
 * @example
 * validateRange(5, 1, 10) // true
 * validateRange(15, 1, 10) // false
 */
export function validateRange(
  num: number,
  min: number = -Infinity,
  max: number = Infinity
): boolean {
  return num >= min && num <= max
}

/**
 * Validate postal code (US ZIP)
 *
 * @example
 * validateZipCode('12345') // true
 * validateZipCode('12345-6789') // true
 * validateZipCode('invalid') // false
 */
export function validateZipCode(zip: string): boolean {
  const zipRegex = /^\d{5}(-\d{4})?$/
  return zipRegex.test(zip)
}
