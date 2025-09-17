// Enums
export enum RequestStatus {
	PENDING = 'PENDING',
	SUCCEEDED = 'SUCCEEDED',
	FAILED = 'FAILED',
}

// DTOs (client-facing)
export interface CreateDataRequestDto {
	prompt: string
}

export interface GraphConfig {
	x: string
	y: string
}

/**
 * Matches the backend DataRequestResultDto
 * resultTable is a column-oriented table: { [columnName]: values[] }
 */
export interface DataRequestResultDto {
	requestId: number
	status: RequestStatus
	prompt: string
	responseId?: string
	sqlScript?: string
	resultText?: string
	resultTable?: Record<string, unknown[]>
	graphConfig?: GraphConfig
}

/** Small helper for UI/composables */
export const isFinalStatus = (s: RequestStatus) =>
	s === RequestStatus.SUCCEEDED || s === RequestStatus.FAILED
