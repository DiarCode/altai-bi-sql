// src/common/decorators/get-current-user.decorator.ts

import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { UserRequest } from '../types/user-request.interface'

/**
 * @GetCurrentUser() → just the user’s id number
 */
export const GetCurrentUser = createParamDecorator((_, ctx: ExecutionContext) => {
	const req = ctx.switchToHttp().getRequest<UserRequest>()
	return req.user
})
