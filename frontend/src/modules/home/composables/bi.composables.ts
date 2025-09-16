import { ref } from 'vue'

import type { BiRequest, BiResponse, RequestBundle, Purpose } from '../models/bi.models'

interface Workspace {
	id: string
	name: string
	description: string
	purpose: Purpose
	createdAt: string
}

interface DatabaseConnection {
	id: string
	dbType: 'PostgreSQL' | 'MySQL'
	username: string
	password: string
	databaseName: string
	host: string
	port: string
	status: 'connected' | 'disconnected' | 'error'
	lastConnected?: string
}

const bundles = ref<RequestBundle[]>([])
const connectedReadonly = ref<boolean>(true) // mock: show "Connected • Readonly"

// Mock workspaces data
const workspaces = ref<Workspace[]>([
	{
		id: 'ws_demo',
		name: 'Demo Workspace',
		description: 'A sample workspace for demonstration',
		purpose: 'E_COMMERCE',
		createdAt: new Date().toISOString(),
	},
	{
		id: 'ws_analytics',
		name: 'Analytics Dashboard',
		description: 'Business analytics and reporting workspace',
		purpose: 'ACCOUNTING',
		createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
	}
])

const activeWorkspace = ref<Workspace | null>(workspaces.value[0])

// Mock database connection
const databaseConnection = ref<DatabaseConnection | null>({
	id: 'conn_1',
	dbType: 'PostgreSQL',
	username: 'demo_user',
	password: '***hidden***',
	databaseName: 'analytics_db',
	host: 'localhost',
	port: '5432',
	status: 'connected',
	lastConnected: new Date().toISOString(),
})

export function useBiRequests() {
	function addBundle(bundle: RequestBundle) {
		bundles.value.unshift(bundle)
	}

	function updateBundle(id: string, partial: Partial<RequestBundle>) {
		const idx = bundles.value.findIndex(b => b.request.id === id)
		if (idx !== -1) bundles.value[idx] = { ...bundles.value[idx], ...partial }
	}

	async function submitPrompt(prompt: string) {
		const id = crypto.randomUUID()
		const req: BiRequest = {
			id,
			prompt,
			createdAt: new Date().toISOString(),
			status: 'pending',
			workspaceId: activeWorkspace.value?.id,
		}
		addBundle({ request: req })

		try {
			// 👉 replace this with your real NL→SQL endpoint
			const resp = await mockNLSql(prompt)
			const response: BiResponse = { ...resp }
			updateBundle(id, {
				request: { ...req, status: 'success', responseId: response.id },
				response,
			})
		} catch {
			updateBundle(id, {
				request: {
					...req,
					status: 'error',
					errorMessage: 'Unexpected error',
				},
			})
		}
	}

	async function retry(bundle: RequestBundle) {
		if (!bundle?.request?.prompt) return
		await submitPrompt(bundle.request.prompt)
	}

	function clearHistory() {
		bundles.value = []
	}

	return {
		bundles,
		submitPrompt,
		retry,
		clearHistory,
		connectedReadonly,
		activeWorkspace,
		workspaces,
		databaseConnection,
	}
}

// Workspace management composable
export function useWorkspaces() {
	async function createWorkspace(data: Omit<Workspace, 'id' | 'createdAt'>) {
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1000))
		
		const newWorkspace: Workspace = {
			...data,
			id: crypto.randomUUID(),
			createdAt: new Date().toISOString(),
		}
		
		workspaces.value.unshift(newWorkspace)
		activeWorkspace.value = newWorkspace
		
		return newWorkspace
	}

	function switchWorkspace(workspaceId: string) {
		const workspace = workspaces.value.find(w => w.id === workspaceId)
		if (workspace) {
			activeWorkspace.value = workspace
			// Clear history when switching workspaces
			bundles.value = []
		}
	}

	return {
		workspaces,
		activeWorkspace,
		createWorkspace,
		switchWorkspace,
	}
}

// Database connection management composable
export function useDatabaseConnection() {
	async function updateConnection(data: Omit<DatabaseConnection, 'id' | 'status' | 'lastConnected'>) {
		// Simulate API call
		await new Promise(resolve => setTimeout(resolve, 1000))
		
		databaseConnection.value = {
			...data,
			id: databaseConnection.value?.id || crypto.randomUUID(),
			status: 'connected',
			lastConnected: new Date().toISOString(),
		}
		
		connectedReadonly.value = true
		
		return databaseConnection.value
	}

	function disconnectDatabase() {
		if (databaseConnection.value) {
			databaseConnection.value.status = 'disconnected'
		}
		connectedReadonly.value = false
	}

	return {
		databaseConnection,
		connectedReadonly,
		updateConnection,
		disconnectDatabase,
	}
}

/** Mock response builder — swap with real API */
async function mockNLSql(prompt: string): Promise<BiResponse> {
	await new Promise(r => setTimeout(r, 900 + Math.random() * 600))
	const id = crypto.randomUUID()

	// Tiny synthetic dataset for demo
	const columns = ['date', 'orders', 'revenue']
	const base = new Date()
	const rows = Array.from({ length: 12 }).map((_, i) => {
		const d = new Date(base)
		d.setDate(base.getDate() - (11 - i))
		const orders = Math.floor(50 + Math.random() * 150)
		const revenue = Math.round(orders * (20 + Math.random() * 60))
		return {
			date: d.toISOString().slice(0, 10),
			orders,
			revenue,
		}
	})

	const sql = `-- auto-generated
SELECT date::date AS date,
       COUNT(*)    AS orders,
       SUM(amount) AS revenue
FROM   orders
WHERE  date >= CURRENT_DATE - INTERVAL '12 days'
GROUP  BY 1
ORDER  BY 1;`

	return {
		id,
		sql,
		resultText: 'Showing the last 12 days of orders and revenue aggregated by date.',
		columns,
		rows,
		graph: {
			xColumn: 'date',
			yColumnName: 'revenue',
			type: 'LINEAR',
		},
	}
}
