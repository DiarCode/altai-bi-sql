export const buildFormData = <T extends object>(
	dto: T,
	opts?: { arrayAsJson?: string[] },
): FormData => {
	const formData = new FormData()

	const appendToFormData = (key: string, value: unknown) => {
		if (value === null || value === undefined) return

		if (value instanceof File) {
			formData.append(key, value)
		} else if (Array.isArray(value)) {
			if (opts?.arrayAsJson?.includes(key)) {
				formData.append(key, JSON.stringify(value))
			} else {
				value.forEach(v => formData.append(key, v))
			}
		} else if (typeof value === 'object') {
			Object.entries(value).forEach(([nestedKey, nestedValue]) => {
				appendToFormData(`${key}[${nestedKey}]`, nestedValue)
			})
		} else {
			formData.append(key, value.toString())
		}
	}

	Object.entries(dto).forEach(([key, value]) => appendToFormData(key, value))

	return formData
}
