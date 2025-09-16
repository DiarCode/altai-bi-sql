import { Injectable } from '@nestjs/common'

export interface PromptTemplate {
	system: string
	user: string
	maxTokens?: number
}

@Injectable()
export class PromptRegistry {
	private readonly templates: Record<string, PromptTemplate> = {
		'sql-generate': {
			system: `You are a cautious SQL assistant. 
			Task: generate a single safe SELECT-only SQL query for a BI question. 
			Rules:\n
			- Only SELECT queries; no CTEs, DDL, DML, temp tables, functions that mutate state.\n
			- Use only the provided schemas, tables and columns.\n
			- Prefer explicit table-qualified names schema.table.column.\n
			- Use INNER/LEFT JOINs only on provided foreign keys.\n
			- When the question contains natural-language labels (like levels, categories, statuses), resolve them by finding semantically relevant TEXT/VARCHAR columns (e.g., name, code, label, title, level, category) in dimension/lookup tables from the provided metadata, then join via declared foreign keys to apply the filter.\n
			- Avoid type mismatches: do not compare string literals to numeric ids; instead, join to the appropriate table and compare like types.\n
			- Always include a LIMIT clause if not present.\n
			- Never guess columns or tables not listed.\n
			- Return ONLY a compact JSON object of shape { "sql": "..." } with no extra text.`,
			user: `Question: {{prompt}}\n\n
			Available schemas/tables/columns:\n{{metadata}}\n\n
			Foreign keys:\n{{foreignKeys}}\n\n
			Output JSON strictly as {"sql":"..."}.`,
			maxTokens: 10240,
		},

		'sql-repair': {
			system: `You are a cautious SQL assistant.
			Task: Given the user's question, the previously generated SQL, the database error it produced, and the database metadata (tables, columns, foreign keys), produce a corrected single SELECT-only SQL query that fixes the error.
			Rules:\n
			- Only SELECT queries; no CTEs, DDL, DML, temp tables, or functions that mutate state.\n
			- Use only the provided schemas, tables, and columns. Prefer fully-qualified names schema.table.column.\n
			- Use JOINs that follow the provided foreign keys.\n
			- If the error indicates a type mismatch (e.g., integer vs string), DO NOT compare a string literal to an integer id. Instead, locate the appropriate dimension/lookup table where such labels live in text columns (e.g., code/name/label/title/level/category) using the provided metadata, then join via foreign keys and compare like types.\n
			- For any natural-language filters (e.g., labels, categories, statuses), identify candidate text columns by their names and data types in the metadata, and apply filters via joins rather than forcing casts.\n
			- If the intent requires joining through intermediate tables (e.g., level -> module -> exercise), do so using foreign keys.\n
			- Always include a LIMIT clause if not present.\n
			- Return ONLY a compact JSON object of shape { "sql": "..." } with no extra text.`,
			user: `Question: {{prompt}}\n\nPrevious SQL:\n{{previousSql}}\n\nDatabase error:\n{{dbError}}\n\nAvailable schemas/tables/columns:\n{{metadata}}\n\nForeign keys:\n{{foreignKeys}}\n\nOutput JSON strictly as {"sql":"..."}.`,
			maxTokens: 10240,
		},

		'result-text': {
			system: `You are a formatter. 
			Given rows (JSON array of objects) from a BI query, produce a short human-friendly summary in English or Russian (depending on data). 
			Rules:\n
			- Return plain text only, 3-6 concise lines.\n
			- Use readable formatting for numbers and currencies if present.\n
			- Do not fabricate values; only summarize given rows.`,
			user: `Rows (JSON):\n{{rows}}\n\nWrite the summary text only.`,
			maxTokens: 10240,
		},

		'graph-config': {
			system: `You are a data viz planner. 
			Given tabular rows (JSON array of objects), propose a compact graph configuration JSON for a dashboard. 
			Rules:\n
			- Choose one of graph types: BAR_CHART | LINE_CHART.\n
			- Include fields: 
			{ "type": GRAPH_TYPE, "x": string, "y": string | string[], "seriesBy"?: string }.\n
			 - Pick fields that exist in rows.\n
			 - Keep it minimal and valid JSON. Return ONLY the JSON object.`,
			user: `Rows (JSON):\n{{rows}}`,
			maxTokens: 10240,
		},

		'business-names': {
			system: `You are a precise data modeling assistant. 
				Given a database table (schema + technical name) and its columns (technical names, data types, and key flags), propose business-friendly names and a concise description for the table and each column. 
				Rules:\n
				- Keep names short (1-4 words), readable and domain-neutral unless obvious from names.\n
				- Respect existing language cues (RU/KZ/EN) from technical names; otherwise prefer English.\n
				- Do not invent fields; only rename provided ones.\n
				- Prefer singular nouns for table names if the table represents entities, plural for collections when obvious.\n
				- Avoid acronyms unless clearly standard (e.g., ID, VAT).\n
				- Output strictly a JSON object with shape:\n
				{\n  "table": { "businessName": string, "description": string },\n  "columns": [ { "columnName": string, "businessName": string, "description": string } ]\n}`,
			user: `Table: {{schema}}.{{table}}\nColumns:\n{{columns}}\n\nReturn ONLY the JSON object.`,
			maxTokens: 10240,
		},
	}

	public get(key: string): PromptTemplate {
		const tpl = this.templates[key]
		if (!tpl) throw new Error(`No prompt template for key "${key}"`)
		return tpl
	}
}
