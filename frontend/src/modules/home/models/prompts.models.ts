// Keep in sync with backend DTOs

export interface CreateDataRequestDto {
	prompt: string
}

/**
 * Backend returns `status: string`. If you know the exact states,
 * lock it down to a union like:
 * type DataRequestStatus = 'QUEUED' | 'PENDING' | 'RUNNING' | 'DONE' | 'ERROR'
 */
export enum DataRequestStatus {
	PENDING = 'PENDING',
	SUCCEEDED = 'SUCCEEDED',
	FAILED = 'FAILED',
}

export interface DataRequestGraphConfig {
	x: string
	y: string
}

export interface DataRequestResultDto {
	requestId: number
	status: DataRequestStatus
	sqlScript?: string
	resultText?: string
	resultTable?: Record<string, unknown[]>
	graphConfig?: DataRequestGraphConfig
}

/* ========= Optional UI adapter (to your GraphView spec) ========= */

export type UiGraphType = 'LINEAR' | 'BAR'
export interface UiGraphSpec {
	xColumn: string
	yColumnName: string
	type: UiGraphType
}

/** Convenient adapter to reuse your GraphView */
export const toUiGraphSpec = (
	res: DataRequestResultDto,
	fallbackType: UiGraphType = 'LINEAR',
): UiGraphSpec | undefined => {
	if (!res.graphConfig) return undefined
	return {
		xColumn: res.graphConfig.x,
		yColumnName: res.graphConfig.y,
		type: fallbackType,
	}
}

/** Terminal helper (adjust if you formalize statuses) */
export const isTerminalStatus = (s?: DataRequestStatus) =>
	s === DataRequestStatus.FAILED ||
	s === DataRequestStatus.PENDING ||
	s === DataRequestStatus.SUCCEEDED
