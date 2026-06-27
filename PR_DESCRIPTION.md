# feat(forms): adopt react-hook-form + zod in profile and add-repository forms

## 📌 Description

Replaces custom controlled input states and ad-hoc validations with standard, schema-based client-side validations using **Zod** and **react-hook-form** (integrated via `zodResolver`) in the `ProfileTab` settings page and the `AddRepositoryModal` maintainer dialog.

## 🔍 Problem

Unvalidated form inputs create a poor user experience with missing inline error feedback and present risks of sending invalid writes to the backend. Form controls were previously using custom validation logic spread across files and lacked accessible ARIA markup to link errors to input controls.

## ✅ Solution

### 1. Schema Modules with TSDoc
- Added `zod` and `@hookform/resolvers` as project dependencies.
- Created `src/features/settings/components/profile/profileSchema.ts` with strict length limits (First/Last name: 50, Location: 100, Bio: 500, Social Handles: 15-100) and website URL protocol validation.
- Created `src/features/maintainers/components/addRepositorySchema.ts` verifying GitHub's exact `owner/repository` pattern (owner: alphanumeric and single hyphens, max 39 chars; repo: alphanumeric, hyphens, underscores, dots, max 100 chars).

### 2. Form Architecture & Validation
- Converted `ProfileTab.tsx` and `AddRepositoryModal.tsx` to use `useForm` configured with the `zodResolver`.
- Replaced custom field validation callbacks (e.g. `validateUrl`, `validateRepoName`, `validateRequired`) with declarative schema rules.
- Disabled form submission while fields are invalid or API requests are in a pending state (`isSubmitting` / `isSaving`).

### 3. Accessible Error Surfacing
- Configured inputs with `aria-invalid={!!errors.fieldName}` to mark fields with errors.
- Assigned unique `id`s to error message containers (`role="alert"`) and associated them to input fields using `aria-describedby` to ensure correct screen reader announcements.
- Linked label components to their controls via `htmlFor`.

---

## 🔒 Security Notes

- **UX-Only Validation**: Client-side validation using Zod schemas is intended for immediate user feedback. We make no changes to backend constraints.
- **Form Length Hard Limits**: Strictly enforces `maxLength` attributes in HTML inputs matching the Zod schema length boundaries to prevent oversized payloads.

---

## 🧪 Testing

Verified using local test suites. Added test cases to `ProfileTab.test.tsx` verifying validation failures for exceeding field length limits, missing fields, invalid URLs, and checking submit button disabled state.

### Test Output

```bash
$ npx vitest run src/features/settings/components/profile/ProfileTab.test.tsx src/features/maintainers/components/AddRepositoryModal.test.tsx

 RUN  v4.1.9 /home/mxr/Grainlify-Frontend

 ✓ src/features/settings/components/profile/ProfileTab.test.tsx (7 tests) 3776ms
   ✓ ProfileTab (7)
     ✓ renders heading and loads data  648ms
     ✓ shows website validation error on blur  1011ms
     ✓ disables submit button when form is not dirty  327ms
     ✓ disables submit button when form is invalid  303ms
     ✓ calls updateProfile and shows success toast on valid submit  343ms
     ✓ shows error toast when updateProfile fails  309ms
     ✓ shows error messages for fields exceeding max length  809ms

 ✓ src/features/maintainers/components/AddRepositoryModal.test.tsx (7 tests) 4223ms
   ✓ AddRepositoryModal (7)
     ✓ renders when isOpen is true  340ms
     ✓ does not render when isOpen is false 13ms
     ✓ shows repo name required error on mount with empty fields  436ms
     ✓ shows repo name format error for missing slash  647ms
     ✓ calls createProject on valid submit  472ms
     ✓ disables submit button while submitting  459ms
     ✓ shows success message and calls onSuccess after valid submit  1842ms

 Test Files  2 passed (2)
      Tests  14 passed (14)
```

## 📊 Changes

```
package.json                                                         |  2 +
package-lock.json                                                    | 26 ++++++++
src/features/maintainers/components/AddRepositoryModal.tsx           | 38 ++++++-----
src/features/maintainers/components/addRepositorySchema.ts           | 40 ++++++++++++
src/features/settings/README.md                                      | 18 ++++++
src/features/settings/components/profile/ProfileTab.test.tsx         | 18 ++++++
src/features/settings/components/profile/ProfileTab.tsx              | 64 ++++++++++++++------
src/features/settings/components/profile/profileSchema.ts            | 61 ++++++++++++++++++
```

## ✅ Acceptance Criteria

- [x] Both forms use react-hook-form with Zod resolver.
- [x] Field-level errors render accessibly (using aria-describedby and role="alert").
- [x] Submit is disabled when the form is invalid or pending.
- [x] Repository URL/owner format is fully validated.
