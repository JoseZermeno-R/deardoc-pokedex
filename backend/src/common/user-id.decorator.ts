import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Request } from 'express';

export const USER_ID_HEADER = 'x-user-id';

// @Headers() doesn't accept pipes, but custom param decorators do.
const UserIdHeader = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<Request>().headers[USER_ID_HEADER],
);

/**
 * The anonymous user id: a UUID the client generates and sends in the
 * X-User-Id header. Responds 400 when it is not a valid UUID, or when it is
 * missing and not optional.
 */
export const UserId = ({ optional = false } = {}) =>
  UserIdHeader(
    new ParseUUIDPipe({
      optional,
      // The pipe's default message ("The value passed as UUID is not a
      // string") doesn't say which header is wrong.
      exceptionFactory: () =>
        new BadRequestException('The X-User-Id header must be a UUID'),
    }),
  );
