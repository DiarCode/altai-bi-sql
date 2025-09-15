import { useQuery } from '@tanstack/vue-query'

import { authService } from '../services/auth.service'

export const USERS_QUERY_KEYS = {
	me: ['user', 'me'] as const,
} as const

export const useMe = () => {
	return useQuery({
		queryKey: USERS_QUERY_KEYS.me,
		queryFn: () => authService.getCurrentUser(),
	})
}
