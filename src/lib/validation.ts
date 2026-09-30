import {
  DEAL_STAGES,
  PROSPECT_SOURCES,
  PROSPECT_STATUSES,
  ROLE_KEYS,
  TASK_PRIORITIES,
  TASK_STATUSES,
} from '@/config/product';
import { z } from 'zod';

export const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .email('Please enter a valid email address')
  .max(255, 'Email must be less than 255 characters')
  .transform((v) => v.trim().toLowerCase());

export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(72, 'Password must be less than 72 characters');

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export const signUpSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must be less than 80 characters')
      .transform((v) => v.trim()),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  fullName: z.string().trim().max(100).optional().or(z.literal('')),
  avatarUrl: z.string().trim().url('Must be a valid URL').optional().or(z.literal('')),
});

export type ProfileValues = z.infer<typeof profileSchema>;

export const organizationCreateSchema = z.object({
  name: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(80, 'Workspace name must be less than 80 characters')
    .transform((v) => v.trim()),
  timezone: z.string().default('UTC'),
});

export const memberInviteSchema = z.object({
  email: emailSchema,
  role_key: z.enum(ROLE_KEYS, {
    errorMap: () => ({ message: 'Please select a valid role' }),
  }),
});

export const prospectSchema = z.object({
  name: z
    .string()
    .min(1, 'Prospect or lead name is required')
    .max(160, 'Name must be less than 160 characters')
    .transform((v) => v.trim()),
  company: z.string().max(120).optional().nullable().transform((v) => v?.trim() || null),
  email: z
    .string()
    .email('Invalid email')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v ? v.trim().toLowerCase() : null)),
  phone: z.string().max(40).optional().nullable().transform((v) => v?.trim() || null),
  source: z.enum(PROSPECT_SOURCES).default('website'),
  status: z.enum(PROSPECT_STATUSES).default('new'),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null),
  owner_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const contactSchema = z.object({
  name: z
    .string()
    .min(1, 'Contact name is required')
    .max(160, 'Name must be less than 160 characters')
    .transform((v) => v.trim()),
  email: z
    .string()
    .email('Invalid email')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v ? v.trim().toLowerCase() : null)),
  phone: z.string().max(40).optional().nullable().transform((v) => v?.trim() || null),
  job_title: z.string().max(100).optional().nullable().transform((v) => v?.trim() || null),
  company: z.string().max(120).optional().nullable().transform((v) => v?.trim() || null),
  prospect_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null),
});

export const dealSchema = z.object({
  title: z
    .string()
    .min(1, 'Deal title is required')
    .max(200, 'Title must be less than 200 characters')
    .transform((v) => v.trim()),
  value: z
    .number({ invalid_type_error: 'Deal value must be a number' })
    .min(0, 'Value must be positive')
    .default(0),
  stage: z.enum(DEAL_STAGES).default('lead'),
  expected_close_date: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  prospect_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  contact_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  owner_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable().transform((v) => v?.trim() || null),
});

export const taskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title is required')
    .max(200, 'Title must be less than 200 characters')
    .transform((v) => v.trim()),
  description: z.string().optional().nullable().transform((v) => v?.trim() || null),
  due_date: z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
  status: z.enum(TASK_STATUSES).default('pending'),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  assignee_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  prospect_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  contact_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  deal_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
});

export const noteSchema = z.object({
  body: z.string().trim().min(1, 'Note content cannot be empty'),
  prospect_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  contact_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
  deal_id: z.string().uuid().optional().nullable().or(z.literal('')).transform((v) => (v ? v : null)),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type OrganizationCreateInput = z.infer<typeof organizationCreateSchema>;
export type MemberInviteInput = z.infer<typeof memberInviteSchema>;
export type ProspectInput = z.infer<typeof prospectSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type DealInput = z.infer<typeof dealSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
