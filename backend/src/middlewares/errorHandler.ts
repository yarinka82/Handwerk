import { Request, Response } from 'express';
import { isHttpError } from 'http-errors';

interface BodyParserError extends SyntaxError {
  status: number;
  body: unknown;
}

interface ExtendedHttpError extends Error {
  statusCode: number;
  data?: unknown;
}

export const errorHandler = (err: unknown, req: Request, res: Response) => {
  if (
    err instanceof SyntaxError &&
    'status' in err &&
    (err as BodyParserError).status === 400 &&
    'body' in err
  )
    return res.status(400).json({
      status: 400,
      message: 'Bad request',
      data: {
        message: 'Malformed request body',
        errors: [err.message],
      },
    });

  if (isHttpError(err)) {
    const data = (err as ExtendedHttpError).data || null;

    res.status(err.statusCode).json({
      status: err.statusCode,
      message: err.message,
      ...(data ? { data } : {}),
    });
    return;
  }

  const message = err instanceof Error ? err.message : String(err);
  res.status(500).json({
    status: 500,
    message: 'Something went wrong',
    error: message,
  });
};
