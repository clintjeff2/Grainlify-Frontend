import { z } from 'zod';

/**
 * TSDoc for Profile Schema Module
 *
 * Defines the validation rules for the user profile form.
 * Supports first name, last name, location, website, bio, and social handles.
 * All fields are optional but subject to specific validation rules (e.g. website URL format).
 */
export const profileSchema = z.object({
  firstName: z
    .string()
    .max(50, { message: 'First name must be 50 characters or less' })
    .optional()
    .or(z.literal('')),
  lastName: z
    .string()
    .max(50, { message: 'Last name must be 50 characters or less' })
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .max(100, { message: 'Location must be 100 characters or less' })
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .trim()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const url = new URL(val);
          return (url.protocol === 'http:' || url.protocol === 'https:') && !!url.hostname;
        } catch {
          return false;
        }
      },
      { message: 'Please enter a valid URL starting with http:// or https://' }
    )
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(500, { message: 'Bio must be 500 characters or less' })
    .optional()
    .or(z.literal('')),
  telegram: z
    .string()
    .max(32, { message: 'Telegram handle must be 32 characters or less' })
    .optional()
    .or(z.literal('')),
  linkedin: z
    .string()
    .max(100, { message: 'LinkedIn handle must be 100 characters or less' })
    .optional()
    .or(z.literal('')),
  whatsapp: z
    .string()
    .max(20, { message: 'WhatsApp handle must be 20 characters or less' })
    .optional()
    .or(z.literal('')),
  twitter: z
    .string()
    .max(15, { message: 'Twitter handle must be 15 characters or less' })
    .optional()
    .or(z.literal('')),
  discord: z
    .string()
    .max(37, { message: 'Discord handle must be 37 characters or less' })
    .optional()
    .or(z.literal('')),
});

/**
 * Type definition for the profile form data inferred from the schema.
 */
export type ProfileFormData = z.infer<typeof profileSchema>;
