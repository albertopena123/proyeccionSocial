import {  parseISO, isValid } from 'date-fns'
import { es } from 'date-fns/locale'
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'

// Zona horaria de Perú
const PERU_TIMEZONE = 'America/Lima'

/**
 * Convierte una fecha UTC a la zona horaria de Perú
 */
export function toPeruTime(date: Date | string | null): Date | null {
  if (!date) return null
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return null
    
    return toZonedTime(dateObj, PERU_TIMEZONE)
  } catch {
    return null
  }
}

/**
 * Convierte una fecha de Perú a UTC para guardar en la base de datos
 */
export function fromPeruTimeToUTC(date: Date | string): Date {
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return fromZonedTime(dateObj, PERU_TIMEZONE)
}

/**
 * Formatea una fecha para mostrar en la UI (formato peruano)
 * Usa formatInTimeZone para formatear directamente en la zona horaria de Perú
 */
export function formatDatePeru(
  date: Date | string | null,
  formatStr: string = 'dd \'de\' MMMM \'de\' yyyy'
): string {
  if (!date) return 'No disponible'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return 'No disponible'
    
    return formatInTimeZone(dateObj, PERU_TIMEZONE, formatStr, { locale: es })
  } catch {
    return 'Fecha inválida'
  }
}

/**
 * Formatea fecha y hora para mostrar en la UI
 */
export function formatDateTimePeru(
  date: Date | string | null,
  formatStr: string = 'dd/MM/yyyy HH:mm'
): string {
  if (!date) return 'No disponible'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return 'No disponible'
    
    return formatInTimeZone(dateObj, PERU_TIMEZONE, formatStr, { locale: es })
  } catch {
    return 'Fecha inválida'
  }
}

/**
 * Formatea fecha corta (solo día/mes/año)
 */
export function formatDateShort(date: Date | string | null): string {
  return formatDateTimePeru(date, 'dd/MM/yyyy')
}

/**
 * Formatea fecha larga con el día de la semana
 */
export function formatDateLong(date: Date | string | null): string {
  return formatDatePeru(date, 'EEEE, dd \'de\' MMMM \'de\' yyyy')
}

/**
 * Formatea hora en formato 12 horas
 */
export function formatTime12h(date: Date | string | null): string {
  return formatDateTimePeru(date, 'hh:mm a')
}

/**
 * Formatea hora en formato 24 horas
 */
export function formatTime24h(date: Date | string | null): string {
  return formatDateTimePeru(date, 'HH:mm')
}

/**
 * Obtiene fecha y hora actual en Perú
 */
export function getNowPeru(): Date {
  return toZonedTime(new Date(), PERU_TIMEZONE)
}

/**
 * Formatea fecha relativa (hace X tiempo)
 */
export function formatRelativeTime(date: Date | string | null): string {
  if (!date) return 'No disponible'
  
  try {
    const peruDate = toPeruTime(date)
    if (!peruDate) return 'No disponible'
    
    const now = getNowPeru()
    const diffInMs = now.getTime() - peruDate.getTime()
    const diffInSeconds = Math.floor(diffInMs / 1000)
    const diffInMinutes = Math.floor(diffInSeconds / 60)
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)
    
    if (diffInSeconds < 60) {
      return 'Hace un momento'
    } else if (diffInMinutes < 60) {
      return `Hace ${diffInMinutes} ${diffInMinutes === 1 ? 'minuto' : 'minutos'}`
    } else if (diffInHours < 24) {
      return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`
    } else if (diffInDays < 30) {
      return `Hace ${diffInDays} ${diffInDays === 1 ? 'día' : 'días'}`
    } else {
      return formatDateShort(date)
    }
  } catch {
    return 'Fecha inválida'
  }
}

/**
 * Formatea fecha con hora y zona horaria
 */
export function formatDateTimeWithTZ(date: Date | string | null): string {
  if (!date) return 'No disponible'
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date
    if (!isValid(dateObj)) return 'No disponible'
    
    // Incluye la zona horaria en el formato
    return formatInTimeZone(dateObj, PERU_TIMEZONE, 'dd/MM/yyyy HH:mm zzz', { locale: es })
  } catch {
    return 'Fecha inválida'
  }
}