import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma.js';
import { config } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import {
  registerSchema,
  verifyEmailSchema,
  resendCodeSchema,
  loginSchema,
} from '../schemas/index.js';
import { sendVerificationEmail } from '../integrations/mailer.js';

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

async function createAndSendVerificationCode(userId: number, email: string): Promise<void> {
  const rawCode = crypto.randomInt(100000, 1000000).toString();
  const codeHash = await bcrypt.hash(rawCode, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  await prisma.email_Verifications.create({
    data: {
      user_id: userId,
      code_hash: codeHash,
      purpose: 'verify_email',
      expires_at: expiresAt,
      attempts: 0,
    },
  });

  await sendVerificationEmail(email, rawCode);
}

export async function registerHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = registerSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const { username, email, password } = parseResult.data;

  // Check if an existing user has this username
  const existingUsername = await prisma.users.findUnique({
    where: { username },
  });

  if (existingUsername) {
    // If username is taken by a different user
    throw new AppError(409, 'USERNAME_TAKEN', 'Username sudah digunakan');
  }

  // Check if an existing user has this email
  const existingEmail = await prisma.users.findUnique({
    where: { email },
  });

  if (existingEmail) {
    // If user already exists and email is verified -> conflict
    if (existingEmail.email_verified_at) {
      throw new AppError(409, 'EMAIL_TAKEN', 'Email sudah digunakan');
    }

    // If user already exists but not verified, treat as resend code
    // Check resend throttle: jeda minimal 60 detik
    const lastVerification = await prisma.email_Verifications.findFirst({
      where: { user_id: existingEmail.user_id, purpose: 'verify_email' },
      orderBy: { created_at: 'desc' },
    });

    if (lastVerification) {
      const diffSec = (Date.now() - new Date(lastVerification.created_at).getTime()) / 1000;
      if (diffSec < 60) {
        throw new AppError(429, 'RESEND_TOO_SOON', 'Harap tunggu 60 detik sebelum meminta kode baru');
      }
    }

    await createAndSendVerificationCode(existingEmail.user_id, email);

    return reply.status(201).send({
      message: 'Kode verifikasi dikirim',
      email: maskEmail(email),
    });
  }

  // Brand new registration: Role is always Creator
  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.users.create({
    data: {
      username,
      email,
      password_hash: passwordHash,
      role: 'Creator',
      email_verified_at: null,
    },
  });

  await createAndSendVerificationCode(newUser.user_id, email);

  return reply.status(201).send({
    message: 'Kode verifikasi dikirim',
    email: maskEmail(email),
  });
}

export async function verifyEmailHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = verifyEmailSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const { email, code } = parseResult.data;

  const user = await prisma.users.findUnique({
    where: { email },
  });

  if (!user) {
    throw new AppError(400, 'INVALID_CODE', 'Kode verifikasi tidak valid');
  }

  // Find latest active code for this email (not consumed)
  const verification = await prisma.email_Verifications.findFirst({
    where: {
      user_id: user.user_id,
      purpose: 'verify_email',
      consumed_at: null,
    },
    orderBy: { created_at: 'desc' },
  });

  if (!verification) {
    throw new AppError(400, 'INVALID_CODE', 'Kode verifikasi tidak ditemukan atau sudah digunakan');
  }

  // Check if attempts >= 5
  if (verification.attempts >= 5) {
    // Invalidate code by consuming it
    await prisma.email_Verifications.update({
      where: { verification_id: verification.verification_id },
      data: { consumed_at: new Date() },
    });
    throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Terlalu banyak percobaan yang salah. Silakan minta kode baru');
  }

  // Check expiration
  if (new Date() > new Date(verification.expires_at)) {
    throw new AppError(400, 'CODE_EXPIRED', 'Kode verifikasi telah kedaluwarsa');
  }

  // Verify bcrypt hash
  const isValid = await bcrypt.compare(code, verification.code_hash);
  if (!isValid) {
    const updatedAttempts = verification.attempts + 1;
    await prisma.email_Verifications.update({
      where: { verification_id: verification.verification_id },
      data: {
        attempts: updatedAttempts,
        consumed_at: updatedAttempts >= 5 ? new Date() : null,
      },
    });

    if (updatedAttempts >= 5) {
      throw new AppError(429, 'TOO_MANY_ATTEMPTS', 'Terlalu banyak percobaan yang salah. Silakan minta kode baru');
    }

    throw new AppError(400, 'INVALID_CODE', 'Kode verifikasi salah');
  }

  // Valid: mark consumed and update email_verified_at
  const now = new Date();
  await prisma.email_Verifications.update({
    where: { verification_id: verification.verification_id },
    data: { consumed_at: now },
  });

  const updatedUser = await prisma.users.update({
    where: { user_id: user.user_id },
    data: { email_verified_at: now },
  });

  const token = jwt.sign(
    {
      userId: updatedUser.user_id,
      username: updatedUser.username,
      role: updatedUser.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  return reply.send({
    token,
    user: {
      user_id: updatedUser.user_id,
      username: updatedUser.username,
      email: updatedUser.email,
      role: updatedUser.role,
    },
  });
}

export async function resendCodeHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = resendCodeSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw parseResult.error;
  }

  const { email } = parseResult.data;

  const user = await prisma.users.findUnique({
    where: { email },
  });

  // Always return generic response to avoid leaking registered emails
  const genericResponse = {
    message: 'Jika email terdaftar, kode verifikasi baru telah dikirim',
  };

  if (!user || user.email_verified_at) {
    return reply.send(genericResponse);
  }

  // Check rate limit: max 5 times per hour per email
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const hourCount = await prisma.email_Verifications.count({
    where: {
      user_id: user.user_id,
      purpose: 'verify_email',
      created_at: { gte: oneHourAgo },
    },
  });

  if (hourCount >= 5) {
    throw new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Batas pengiriman kode tercapai (maks 5 kali per jam)');
  }

  // Jeda minimal 60 detik sejak kode terakhir
  const lastVerification = await prisma.email_Verifications.findFirst({
    where: {
      user_id: user.user_id,
      purpose: 'verify_email',
    },
    orderBy: { created_at: 'desc' },
  });

  if (lastVerification) {
    const diffSec = (Date.now() - new Date(lastVerification.created_at).getTime()) / 1000;
    if (diffSec < 60) {
      throw new AppError(429, 'RESEND_TOO_SOON', 'Harap tunggu 60 detik sebelum meminta kode baru');
    }
  }

  await createAndSendVerificationCode(user.user_id, email);

  return reply.send(genericResponse);
}

export async function loginHandler(request: FastifyRequest, reply: FastifyReply) {
  const parseResult = loginSchema.safeParse(request.body);
  if (!parseResult.success) {
    throw new AppError(400, 'INVALID_INPUT', 'Username or email and password are required');
  }

  const { username, email, password } = parseResult.data;
  const identifier = username || email!;

  const user = await prisma.users.findFirst({
    where: {
      OR: [
        { username: identifier },
        { email: identifier },
      ],
    },
  });

  // Generic credential error
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);
  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid username or password');
  }

  // Check email verified
  if (!user.email_verified_at) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Email belum diverifikasi');
  }

  const token = jwt.sign(
    {
      userId: user.user_id,
      username: user.username,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn as any }
  );

  return reply.send({
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
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
      email: true,
      role: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  }

  return reply.send({
    user: {
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      created_at: user.created_at,
    },
  });
}

