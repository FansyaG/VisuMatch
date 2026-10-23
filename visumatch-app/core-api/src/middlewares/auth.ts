import { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { prisma } from '../utils/prisma.js';

export interface TokenPayload {
  userId: number;
  username: string;
  role: 'Admin' | 'Creator';
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: TokenPayload;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  let token: string | undefined;

  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if ((request.query as { token?: string })?.token) {
    token = (request.query as { token?: string }).token;
  }

  if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid Authorization header or token query parameter');
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as TokenPayload;
    request.user = decoded;
  } catch (err) {
    throw new AppError(401, 'INVALID_TOKEN', 'Token is expired or invalid');
  }
}

export function authorizeRole(roles: ('Admin' | 'Creator')[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
    }
    if (!roles.includes(request.user.role)) {
      if (roles.length === 1 && roles[0] === 'Creator') {
        throw new AppError(403, 'FORBIDDEN_ROLE', 'Endpoint ini hanya untuk Creator');
      }
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    }
  };
}

export async function checkProjectOwnership(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'User not authenticated');
  }

  const { id } = request.params as { id: string };
  const projectId = parseInt(id, 10);
  if (isNaN(projectId)) {
    throw new AppError(400, 'INVALID_PARAMETER', 'Project ID must be a valid number');
  }

  const project = await prisma.projects.findUnique({
    where: { project_id: projectId },
  });

  if (!project) {
    throw new AppError(404, 'PROJECT_NOT_FOUND', 'Project not found');
  }

  // Admin has no special bypass for Creator endpoints; Creator can only access their own
  if (project.user_id !== request.user.userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have access to this project');
  }
}
