/**
 * The following code is modified based on
 * https://github.com/remix-run/remix/blob/main/packages/remix-server-runtime/errors.ts
 *
 * MIT Licensed
 * Author Michael Jackson
 * Copyright 2021 Remix Software Inc.
 * https://github.com/remix-run/remix/blob/main/LICENSE.md
 */

import type {
  ErrorResponse,
  StaticHandlerContext,
} from '@modern-js/runtime-utils/router';
import { isRouteErrorResponse } from '@modern-js/runtime-utils/router';

/**
 * This thing probably warrants some explanation.
 *
 * The whole point here is to emulate componentDidCatch for server rendering and
 * data loading. It can get tricky. React can do this on component boundaries
 * but doesn't support it for server rendering or data loading. We know enough
 * with nested routes to be able to emulate the behavior (because we know them
 * statically before rendering.)
 *
 * Each route can export an `ErrorBoundary`.
 *
 * - When rendering throws an error, the nearest error boundary will render
 *   (normal react componentDidCatch). This will be the route's own boundary, but
 *   if none is provided, it will bubble up to the parents.
 * - When data loading throws an error, the nearest error boundary will render
 * - When performing an action, the nearest error boundary for the action's
 *   route tree will render (no redirect happens)
 *
 * During normal react rendering, we do nothing special, just normal
 * componentDidCatch.
 *
 * For server rendering, we mutate `renderBoundaryRouteId` to know the last
 * layout that has an error boundary that tried to render. This emulates which
 * layout would catch a thrown error. If the rendering fails, we catch the error
 * on the server, and go again a second time with the emulator holding on to the
 * information it needs to render the same error boundary as a dynamically
 * thrown render error.
 *
 * When data loading, server or client side, we use the emulator to likewise
 * hang on to the error and re-render at the appropriate layout (where a thrown
 * error would have been caught by cDC).
 *
 * When actions throw, it all works the same. There's an edge case to be aware
 * of though. Actions normally are required to redirect, but in the case of
 * errors, we render the action's route with the emulator holding on to the
 * error. If during this render a parent route/loader throws we ignore that new
 * error and render the action's original error as deeply as possible. In other
 * words, we simply ignore the new error and use the action's error in place
 * because it came first, and that just wouldn't be fair to let errors cut in
 * line.
 */

export function sanitizeError<T = unknown>(error: T) {
  if (
    error instanceof Error &&
    process.env.NODE_ENV !== 'development' &&
    process.env.NODE_ENV !== 'test'
  ) {
    const sanitized = new Error(error.message || 'Unexpected Server Error');
    sanitized.stack = undefined;
    return sanitized;
  }
  return error;
}

export function sanitizeErrors(
  errors: NonNullable<StaticHandlerContext['errors']>,
) {
  return Object.entries(errors).reduce((acc, [routeId, error]) => {
    return Object.assign(acc, { [routeId]: sanitizeError(error) });
  }, {});
}

// must be type alias due to inference issues on interfaces
// https://github.com/microsoft/TypeScript/issues/15300
export type SerializedError = {
  message: string;
  stack?: string;
};

export function serializeError(error: Error): SerializedError {
  const sanitized = sanitizeError(error);
  return {
    message: sanitized.message,
    stack: sanitized.stack,
  };
}

export function serializeErrors(
  errors: StaticHandlerContext['errors'],
): StaticHandlerContext['errors'] {
  if (!errors) {
    return null;
  }
  const entries = Object.entries(errors);
  const serialized: StaticHandlerContext['errors'] = {};
  for (const [key, val] of entries) {
    // Hey you!  If you change this, please change the corresponding logic in
    // deserializeErrors in remix-react/errors.ts :)
    if (isRouteErrorResponse(val)) {
      serialized[key] = { ...val, __type: 'RouteErrorResponse' };
    } else if (val instanceof Error) {
      const sanitized = sanitizeError(val);
      serialized[key] = {
        message: sanitized.message,
        stack: sanitized.stack,
        __type: 'Error',
        // If this is a subclass (i.e., ReferenceError), send up the type so we
        // can re-create the same type during hydration.  This will only apply
        // in dev mode since all production errors are sanitized to normal
        // Error instances
        ...(sanitized.name !== 'Error'
          ? {
              __subType: sanitized.name,
            }
          : {}),
      };
    } else {
      serialized[key] = val;
    }
  }
  return serialized;
}

export function errorResponseToJson(errorResponse: ErrorResponse): Response {
  return Response.json(
    // @ts-expect-error This is "private" from users but intended for internal use
    serializeError(errorResponse.error || new Error('Unexpected Server Error')),
    {
      status: errorResponse.status,
      statusText: errorResponse.statusText,
      headers: {
        'X-Modernjs-Error': 'yes',
      },
    },
  );
}
