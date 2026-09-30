import { describe, expect, it } from 'vitest';
import {
  contactSchema,
  dealSchema,
  memberInviteSchema,
  noteSchema,
  organizationCreateSchema,
  prospectSchema,
  signInSchema,
  signUpSchema,
  taskSchema,
} from './validation';

describe('auth validation', () => {
  it('validates sign in correctly', () => {
    expect(
      signInSchema.safeParse({
        email: 'user@example.com',
        password: 'password123',
      }).success,
    ).toBe(true);
    expect(
      signInSchema.safeParse({
        email: 'invalid-email',
        password: 'password123',
      }).success,
    ).toBe(false);
    expect(
      signInSchema.safeParse({ email: 'user@example.com', password: '' })
        .success,
    ).toBe(false);
  });

  it('rejects password mismatch on signup', () => {
    const res = signUpSchema.safeParse({
      fullName: 'Alice Test',
      email: 'alice@example.com',
      password: 'password123',
      confirmPassword: 'different-password',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.errors[0].message).toBe('Passwords do not match');
    }
  });
});

describe('organization & member validation', () => {
  it('validates organization creation', () => {
    expect(
      organizationCreateSchema.safeParse({ name: 'Acme Corp' }).success,
    ).toBe(true);
    expect(organizationCreateSchema.safeParse({ name: 'A' }).success).toBe(
      false,
    );
  });

  it('validates member invitations and roles', () => {
    expect(
      memberInviteSchema.safeParse({
        email: 'bob@example.com',
        role_key: 'manager',
      }).success,
    ).toBe(true);
    expect(
      memberInviteSchema.safeParse({
        email: 'bob@example.com',
        role_key: 'superadmin',
      }).success,
    ).toBe(false);
  });
});

describe('CRM domain validation', () => {
  it('validates prospect schemas', () => {
    const res = prospectSchema.safeParse({
      name: 'Elena Rostova',
      company: 'AeroPulse',
      email: 'elena@example.com',
      source: 'website',
      status: 'qualified',
      tags: ['enterprise'],
    });
    expect(res.success).toBe(true);
  });

  it('validates contact schemas', () => {
    const res = contactSchema.safeParse({
      name: 'John Doe',
      email: 'john@example.com',
      company: 'Acme Corp',
    });
    expect(res.success).toBe(true);
  });

  it('validates deal schemas', () => {
    const res = dealSchema.safeParse({
      title: 'AeroPulse Enterprise',
      value: 85000,
      stage: 'negotiation',
    });
    expect(res.success).toBe(true);

    const negative = dealSchema.safeParse({
      title: 'Invalid Deal',
      value: -500,
    });
    expect(negative.success).toBe(false);
  });

  it('validates task schemas', () => {
    expect(
      taskSchema.safeParse({
        title: 'Review MSA',
        status: 'pending',
        priority: 'urgent',
      }).success,
    ).toBe(true);
  });

  it('validates note schemas', () => {
    expect(noteSchema.safeParse({ body: 'Meeting went great.' }).success).toBe(
      true,
    );
    expect(noteSchema.safeParse({ body: '   ' }).success).toBe(false);
  });
});
