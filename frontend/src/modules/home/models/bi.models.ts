export type Purpose = 'HEALTH_CARE' | 'E_COMMERCE' | 'GOVERNEMENT' | 'ACCOUNTING' | 'OTHER'

export type GraphType = 'LINEAR' | 'BAR'

export interface GraphSpec {
	xColumn: string
	yColumnName: string
	type: GraphType
}

export interface BiResponse {
	id: string
	sql: string
	resultText: string
	// normalized table shape for easier rendering
	columns: string[]
	rows: Record<string, unknown>[]
	graph?: GraphSpec
}

export type RequestStatus = 'pending' | 'success' | 'error'

export interface BiRequest {
	id: string
	prompt: string
	createdAt: string // ISO
	status: RequestStatus
	responseId?: string
	errorMessage?: string
	workspaceId?: string
}

export interface RequestBundle {
	request: BiRequest
	response?: BiResponse
}
