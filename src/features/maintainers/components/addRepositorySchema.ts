import { z } from 'zod';

/**
 * TSDoc for Add Repository Schema Module
 *
 * Defines the validation rules for adding a repository.
 * Enforces format validation on the GitHub full name (owner/repo) and required fields.
 */
export const addRepositorySchema = z.object({
  githubFullName: z
    .string()
    .trim()
    .min(1, { message: 'Repository name is required' })
    .max(140, { message: 'Repository name must be 140 characters or less' })
    .refine((val) => val.includes('/'), {
      message: 'Repository name must be in format: owner/repo',
    })
    .refine((val) => !val.startsWith('/') && !val.endsWith('/'), {
      message: 'Repository name must be in format: owner/repo',
    })
    .refine(
      (val) => {
        const parts = val.split('/');
        if (parts.length !== 2) return false;
        const [owner, repo] = parts;
        // GitHub owner/organization rules (alphanumeric or hyphens, max 39 characters, no leading/trailing/consecutive hyphens)
        const ownerRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
        // GitHub repository rules (alphanumeric, hyphens, underscores, dots, max 100 characters)
        const repoRegex = /^[a-zA-Z0-9._-]{1,100}$/;
        return ownerRegex.test(owner) && repoRegex.test(repo);
      },
      {
        message:
          'Repository name contains invalid characters. Use owner/repo format with letters, numbers, hyphens, underscores, and dots.',
      }
    ),
  ecosystemName: z
    .string()
    .trim()
    .min(1, { message: 'Ecosystem is required' }),
  language: z.string().optional().or(z.literal('')),
  tags: z.string().optional().or(z.literal('')),
  category: z.string().optional().or(z.literal('')),
});

/**
 * Type definition for the add repository form data inferred from the schema.
 */
export type AddRepositoryFormData = z.infer<typeof addRepositorySchema>;
