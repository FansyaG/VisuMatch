import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { loginSchema } from '../schemas/index.js';

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = loginSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Username and password are required');
  }

  const { username, password } = parseResult.data;

  const user = await prisma.users.findUnique({
    where: { username },
  });

  // Generic login error message
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }

  const token = jwt.sign(
    {
      userId: user.user_id,
      username: user.username,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );

  return reply.send({
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      role: user.role,
    },
  });
}

export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');
  }

  const user = await prisma.users.findUnique({
    where: { user_id: request.user.userId },
    select: {
      user_id: true,
      username: true,
      role: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return reply.send({ user });
}
