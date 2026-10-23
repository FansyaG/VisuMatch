import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import supertest from 'supertest';
import bcrypt from 'bcrypt';
import { buildApp } from '../src/app.js';
import { prisma } from '../src/utils/prisma.js';
import { FastifyInstance } from 'fastify';

describe('Auth & Email Verification Integration Tests', () => {
  let app: FastifyInstance;
  let request: any;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);
  });

  afterAll(async () => {
    // Cleanup created test users
    await prisma.users.deleteMany({
      where: {
        username: {
          in: ['testuser_creator_a', 'testuser_creator_b', 'testuser_auth_flow', 'testuser_expire'],
        },
      },
    });
    await app.close();
  });

  it('Flow: register -> verify -> login successfully', async () => {
    const email = 'flow_test@example.com';
    const username = 'testuser_auth_flow';
    const password = 'Password123';

    // 1. Register
    const regRes = await request
      .post('/api/v1/auth/register')
      .send({ username, email, password });

    expect(regRes.status).toBe(201);
    expect(regRes.body.message).toBe('Kode verifikasi dikirim');
    expect(regRes.body.email).toBeDefined();

    // 2. Cannot login before verification
    const preLoginRes = await request
      .post('/api/v1/auth/login')
      .send({ username, password });
    expect(preLoginRes.status).toBe(403);
    expect(preLoginRes.body.error.code).toBe('EMAIL_NOT_VERIFIED');

    // 3. Find verification record in DB
    const user = await prisma.users.findUnique({
      where: { username },
      include: { email_verifications: true },
    });
    expect(user).toBeDefined();
    expect(user?.role).toBe('Creator');
    expect(user?.email_verifications.length).toBeGreaterThan(0);

    const verification = user!.email_verifications[0];

    // 4. Test wrong code
    const wrongCodeRes = await request
      .post('/api/v1/auth/verify-email')
      .send({ email, code: '000000' });
    expect(wrongCodeRes.status).toBe(400);
    expect(wrongCodeRes.body.error.code).toBe('INVALID_CODE');

    // 5. Test valid code by generating known code
    const knownCode = '123456';
    const codeHash = await bcrypt.hash(knownCode, 10);
    await prisma.email_Verifications.update({
      where: { verification_id: verification.verification_id },
      data: { code_hash: codeHash, attempts: 0 },
    });

    const verifyRes = await request
      .post('/api/v1/auth/verify-email')
      .send({ email, code: knownCode });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.token).toBeDefined();
    expect(verifyRes.body.user.role).toBe('Creator');
    expect(verifyRes.body.user.username).toBe(username);

    // 6. Login using email or username
    const loginUsernameRes = await request
      .post('/api/v1/auth/login')
      .send({ username, password });
    expect(loginUsernameRes.status).toBe(200);
    expect(loginUsernameRes.body.user.role).toBe('Creator');

    const loginEmailRes = await request
      .post('/api/v1/auth/login')
      .send({ email, password });
    expect(loginEmailRes.status).toBe(200);
    expect(loginEmailRes.body.user.username).toBe(username);
  });

  it('Verifies that expired code returns 400 CODE_EXPIRED', async () => {
    const email = 'expire_test@example.com';
    const username = 'testuser_expire';
    const password = 'Password123';

    await request
      .post('/api/v1/auth/register')
      .send({ username, email, password });

    const user = await prisma.users.findUnique({
      where: { username },
      include: { email_verifications: true },
    });

    const verification = user!.email_verifications[0];
    const knownCode = '654321';
    const codeHash = await bcrypt.hash(knownCode, 10);

    // Set expiration in past
    await prisma.email_Verifications.update({
      where: { verification_id: verification.verification_id },
      data: {
        code_hash: codeHash,
        expires_at: new Date(Date.now() - 60000), // 1 minute ago
      },
    });

    const res = await request
      .post('/api/v1/auth/verify-email')
      .send({ email, code: knownCode });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CODE_EXPIRED');
  });

  it('Verifies attempts >= 5 returns 429 TOO_MANY_ATTEMPTS', async () => {
    const email = 'flow_test@example.com'; // User already created
    const user = await prisma.users.findUnique({
      where: { email },
    });

    // Create a new unconsumed verification with 4 attempts
    const codeHash = await bcrypt.hash('888888', 10);
    const ver = await prisma.email_Verifications.create({
      data: {
        user_id: user!.user_id,
        code_hash: codeHash,
        expires_at: new Date(Date.now() + 600000),
        attempts: 4,
      },
    });

    // 5th wrong attempt
    const res5 = await request
      .post('/api/v1/auth/verify-email')
      .send({ email, code: '000000' });
    expect(res5.status).toBe(429);
    expect(res5.body.error.code).toBe('TOO_MANY_ATTEMPTS');
  });
});

describe('Role & Ownership Security Tests', () => {
  let app: FastifyInstance;
  let request: any;
  let adminToken: string;
  let creatorAToken: string;
  let creatorBToken: string;
  let projectAId: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
    request = supertest(app.server);

    const now = new Date();
    const hash = await bcrypt.hash('password123', 10);

    // Seed or fetch Admin
    await prisma.users.upsert({
      where: { username: 'admin' },
      update: { email_verified_at: now },
      create: {
        username: 'admin',
        email: 'admin@test.local',
        password_hash: hash,
        role: 'Admin',
        email_verified_at: now,
      },
    });

    // Seed Creator A
    const userA = await prisma.users.upsert({
      where: { username: 'testuser_creator_a' },
      update: { email_verified_at: now },
      create: {
        username: 'testuser_creator_a',
        email: 'creator_a@test.local',
        password_hash: hash,
        role: 'Creator',
        email_verified_at: now,
      },
    });

    // Seed Creator B
    const userB = await prisma.users.upsert({
      where: { username: 'testuser_creator_b' },
      update: { email_verified_at: now },
      create: {
        username: 'testuser_creator_b',
        email: 'creator_b@test.local',
        password_hash: hash,
        role: 'Creator',
        email_verified_at: now,
      },
    });

    // Create Project for Creator A
    const projA = await prisma.projects.create({
      data: {
        user_id: userA.user_id,
        project_name: 'Project Creator A',
        resolution: '1080p',
      },
    });
    projectAId = projA.project_id;

    // Logins
    const adminLogin = await request.post('/api/v1/auth/login').send({ username: 'admin', password: 'password123' });
    adminToken = adminLogin.body.token;

    const creatorALogin = await request.post('/api/v1/auth/login').send({ username: 'testuser_creator_a', password: 'password123' });
    creatorAToken = creatorALogin.body.token;

    const creatorBLogin = await request.post('/api/v1/auth/login').send({ username: 'testuser_creator_b', password: 'password123' });
    creatorBToken = creatorBLogin.body.token;
  });

  afterAll(async () => {
    await prisma.projects.deleteMany({
      where: { project_id: projectAId },
    });
    await prisma.users.deleteMany({
      where: { username: { in: ['testuser_creator_a', 'testuser_creator_b'] } },
    });
    await app.close();
  });

  it('Creator A can view their own project', async () => {
    const res = await request
      .get(`/api/v1/projects/${projectAId}`)
      .set('Authorization', `Bearer ${creatorAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.project.project_id).toBe(projectAId);
  });

  it('Creator A cannot see Creator B projects in GET /projects', async () => {
    const res = await request
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${creatorBToken}`);
    expect(res.status).toBe(200);
    const hasProjectA = res.body.projects.some((p: any) => p.project_id === projectAId);
    expect(hasProjectA).toBe(false);
  });

  it('Creator B gets 403 trying to view or edit Creator A project', async () => {
    const res = await request
      .get(`/api/v1/projects/${projectAId}`)
      .set('Authorization', `Bearer ${creatorBToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Admin gets 403 on /projects (Creator-only endpoint)', async () => {
    const res = await request
      .get('/api/v1/projects')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('Creator gets 403 on /admin/assets (Admin-only endpoint)', async () => {
    const res = await request
      .get('/api/v1/admin/assets')
      .set('Authorization', `Bearer ${creatorAToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
