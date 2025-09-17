export type GraphType = 'LINEAR' | 'BAR'

export interface GraphSpec {
	xColumn: string
	yColumnName: string
	type: GraphType
}

export interface HistoryResponse {
	sql: string
	resultText: string
	columns: string[]
	rows: Array<Record<string, unknown>>
	graph?: GraphSpec
}

export type UiStatus = 'pending' | 'success' | 'error'

export interface HistoryRequest {
	id: number
	prompt?: string
	status: UiStatus
	createdAt?: number
	errorMessage?: string
}

export interface RequestBundle {
	request: HistoryRequest
	response?: HistoryResponse
}
