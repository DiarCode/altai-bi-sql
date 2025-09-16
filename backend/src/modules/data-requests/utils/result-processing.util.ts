import { Prisma } from '@prisma/client'
import { ColumnPrimitive, ColumnarTable } from '../types/result.types'

export function stripCodeFences(s: string): string {
  const fence = /^```[a-zA-Z0-9]*\n([\s\S]*?)\n```$/
  const m = s.match(fence)
  if (m) return m[1].trim()
  return s
}

export function limitRowsAndSize(
  rows: Record<string, unknown>[],
  maxRows: number,
  maxBytes: number,
): Record<string, unknown>[] {
  let limited: Record<string, unknown>[] = rows.slice(0, maxRows)
  let json = JSON.stringify(limited)
  while (Buffer.byteLength(json, 'utf8') > maxBytes && limited.length > 0) {
    limited = limited.slice(0, Math.max(1, Math.floor(limited.length * 0.8)))
    json = JSON.stringify(limited)
  }
  return JSON.parse(json) as Record<string, unknown>[]
}

export function maskPII(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const piiPatterns = [/email/i, /phone/i, /mobile/i, /ssn/i, /tax/i]
  return rows.map(r => {
    const copy: Record<string, unknown> = { ...r }
    Object.keys(copy).forEach(k => {
      if (piiPatterns.some(p => p.test(k))) {
        const v = copy[k]
        if (typeof v === 'string') copy[k] = maskString(v)
        else if (typeof v === 'number') copy[k] = '***'
        else if (v) copy[k] = '***'
      }
    })
    return copy
  })
}

export function maskString(s: string): string {
  if (s.length <= 4) return '*'.repeat(s.length)
  return s.slice(0, 2) + '***' + s.slice(-2)
}

export function rowsToColumnar(rows: Record<string, unknown>[]): ColumnarTable {
  const result: ColumnarTable = {}
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      if (!result[k]) result[k] = []
      result[k].push(toColumnPrimitive(v))
    }
  }
  return result
}

export function toColumnPrimitive(v: unknown): ColumnPrimitive {
  if (v === null) return null
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v
  if (v instanceof Date) return v.toISOString()
  try {
    const s = JSON.stringify(v)
    return (s ?? '[unserializable]') as unknown as ColumnPrimitive
  } catch {
    return '[unserializable]'
  }
}

export function parseColumnarTable(value: Prisma.JsonValue | null): ColumnarTable | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const obj = value as Record<string, unknown>
  const out: ColumnarTable = {}
  for (const [k, v] of Object.entries(obj)) {
    if (!Array.isArray(v)) return undefined
    const arr: ColumnPrimitive[] = []
    const source: unknown[] = v as unknown[]
    for (const item of source) {
      if (
        item === null ||
        typeof item === 'string' ||
        typeof item === 'number' ||
        typeof item === 'boolean'
      ) {
        arr.push(item as ColumnPrimitive)
      } else {
        try {
          const s = JSON.stringify(item)
          arr.push((s ?? '[unserializable]') as ColumnPrimitive)
        } catch {
          arr.push('[unserializable]')
        }
      }
    }
    out[k] = arr
  }
  return out
}

export function toJsonValue(x: unknown, depth = 0): Prisma.JsonValue | undefined {
  if (depth > 8) return undefined
  if (x === null) return null
  const t = typeof x
  if (t === 'string' || t === 'number' || t === 'boolean') return x as Prisma.JsonValue
  if (Array.isArray(x)) {
    const arr: Prisma.JsonArray = []
    for (const item of x) {
      const v = toJsonValue(item, depth + 1)
      if (v === undefined) return undefined
      arr.push(v)
    }
    return arr
  }
  if (t === 'object') {
    const obj = x as Record<string, unknown>
    const out: { [k: string]: Prisma.JsonValue } = {}
    for (const [k, v] of Object.entries(obj)) {
      const j = toJsonValue(v, depth + 1)
      if (j === undefined) return undefined
      out[k] = j
    }
    return out as Prisma.JsonObject
  }
  return undefined
}

export function asJsonObject(x: unknown): Prisma.JsonObject | undefined {
  const v = toJsonValue(x)
  if (v && typeof v === 'object' && !Array.isArray(v)) return v
  return undefined
}
