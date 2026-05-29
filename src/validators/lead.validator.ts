import { z } from 'zod';
import { LeadStep, TeqviraService } from '../types/index.js';

// ---- Individual field schemas -----------------------------------

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name is too long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens and apostrophes');

export const emailSchema = z
  .string()
  .email('Please provide a valid email address')
  .max(254, 'Email address is too long');

export const phoneSchema = z
  .string()
  .regex(
    /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,14}[0-9]$/,
    'Please provide a valid phone number',
  );

export const companySchema = z
  .string()
  .max(150, 'Company name is too long')
  .optional();

export const serviceSchema = z.nativeEnum(TeqviraService, {
  message: 'Please select a valid Teqvira service',
});

export const requirementsSchema = z
  .string()
  .min(10, 'Please describe your requirements in at least 10 characters')
  .max(2000, 'Requirements description is too long');

// ---- Step-keyed schema map --------------------------------------

export const leadStepSchemas: Record<
  Exclude<LeadStep, LeadStep.COMPLETE>,
  z.ZodTypeAny
> = {
  [LeadStep.NAME]:         nameSchema,
  [LeadStep.EMAIL]:        emailSchema,
  [LeadStep.PHONE]:        phoneSchema,
  [LeadStep.COMPANY]:      companySchema,
  [LeadStep.SERVICE]:      serviceSchema,
  [LeadStep.REQUIREMENTS]: requirementsSchema,
};

// ---- Full lead schema for final validation ----------------------

export const fullLeadSchema = z.object({
  name:         nameSchema,
  email:        emailSchema,
  phone:        phoneSchema,
  company:      companySchema,
  service:      serviceSchema,
  requirements: requirementsSchema,
  sessionId:    z.string().uuid(),
});

export type FullLeadInput = z.infer<typeof fullLeadSchema>;
