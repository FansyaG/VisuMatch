import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function errorHandler(error: FastifyError | AppError | Error, request: FastifyRequest, reply: FastifyReply) {
  request.log.error(error);

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
      },
    });
  }

  if (error instanceof ZodError) {
    return reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
      },
    });
  }

  // Fastify schema validation errors
  if ('validation' in error && error.validation) {
    return reply.status(422).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
      },
    });
  }

  const statusCode = (error as any).statusCode || 500;
  return reply.status(statusCode).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
  });
}
