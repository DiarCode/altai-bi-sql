import { ref } from 'vue'

import type { BiRequest, BiResponse, RequestBundle } from '../models/bi.models'

const bundles = ref<RequestBundle[]>([])
const connectedReadonly = ref<boolean>(true) // mock: show "Connected • Readonly"
const activeWorkspace = ref<{ id: string; name: string } | null>({
	id: 'ws_demo',
	name: 'Demo Workspace',
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
