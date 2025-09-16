import { NotFoundException } from '@nestjs/common'
import { MysqlConfig, PostgresConfig } from '../types/data-source.types'

export function normalizePostgresConfig(x: unknown): PostgresConfig {
  if (!x || typeof x !== 'object') {
    throw new NotFoundException('Invalid Postgres config payload')
  }
  const obj = x as Record<string, unknown>
  const portRaw = obj.port
  const portNum = typeof portRaw === 'number' ? portRaw : Number(portRaw)
  if (!Number.isFinite(portNum)) throw new NotFoundException('Invalid Postgres port')
  const host = obj.host
  const database = obj.database
  const user = obj.user
  const password = obj.password
  if (
    typeof host !== 'string' ||
    typeof database !== 'string' ||
    typeof user !== 'string' ||
    typeof password !== 'string'
  ) {
    throw new NotFoundException('Invalid Postgres config fields')
  }
  const sslVal = obj.ssl
  const ssl = typeof sslVal === 'boolean' ? sslVal : sslVal === 'true'
  return { host, port: portNum, database, user, password, ssl }
}

export function normalizeMysqlConfig(x: unknown): MysqlConfig {
  if (!x || typeof x !== 'object') {
    throw new NotFoundException('Invalid MySQL config payload')
  }
  const obj = x as Record<string, unknown>
  const portRaw = obj.port
  const portNum = typeof portRaw === 'number' ? portRaw : Number(portRaw)
  if (!Number.isFinite(portNum)) throw new NotFoundException('Invalid MySQL port')
  const host = obj.host
  const database = obj.database
  const user = obj.user
  const password = obj.password
  if (
    typeof host !== 'string' ||
    typeof database !== 'string' ||
    typeof user !== 'string' ||
    typeof password !== 'string'
  ) {
    throw new NotFoundException('Invalid MySQL config fields')
  }
  return { host, port: portNum, database, user, password }
}

export function asPostgresConfigOrThrow(x: unknown): PostgresConfig {
  if (
    x &&
    typeof x === 'object' &&
    typeof (x as PostgresConfig).host === 'string' &&
    typeof (x as PostgresConfig).port === 'number' &&
    typeof (x as PostgresConfig).database === 'string' &&
    typeof (x as PostgresConfig).user === 'string' &&
    typeof (x as PostgresConfig).password === 'string'
  ) {
    return x as PostgresConfig
  }
  throw new NotFoundException('Invalid Postgres config')
}

export function asMysqlConfigOrThrow(x: unknown): MysqlConfig {
  if (
    x &&
    typeof x === 'object' &&
    typeof (x as MysqlConfig).host === 'string' &&
    typeof (x as MysqlConfig).port === 'number' &&
    typeof (x as MysqlConfig).database === 'string' &&
    typeof (x as MysqlConfig).user === 'string' &&
    typeof (x as MysqlConfig).password === 'string'
  ) {
    return x as MysqlConfig
  }
  throw new NotFoundException('Invalid MySQL config')
}

export function cleanMarkdownJson(txt: string): string {
  return txt.trim().replace(/^```(json)?/i, '').replace(/```$/, '').trim()
}
