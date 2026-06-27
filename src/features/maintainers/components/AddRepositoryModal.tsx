import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useTheme } from '../../../shared/contexts/ThemeContext';
import { createProject, getEcosystems } from '../../../shared/api/client';
import { SkeletonLoader } from '../../../shared/components/SkeletonLoader';
import { addRepositorySchema, AddRepositoryFormData } from './addRepositorySchema';

interface AddRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddRepositoryModal({ isOpen, onClose, onSuccess }: AddRepositoryModalProps) {
  const { theme } = useTheme();
  const darkTheme = theme === 'dark';

  const {
    register,
    handleSubmit,
    control,
    reset,
    trigger,
    formState: { errors, isValid },
  } = useForm<AddRepositoryFormData>({
    resolver: zodResolver(addRepositorySchema),
    mode: 'onChange',
    defaultValues: {
      githubFullName: '',
      ecosystemName: '',
      language: '',
      tags: '',
      category: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      trigger();
    }
  }, [isOpen, trigger]);

  const [ecosystems, setEcosystems] = useState<Array<{ name: string; slug: string }>>([]);
  const [isLoadingEcosystems, setIsLoadingEcosystems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load ecosystems on mount
  useEffect(() => {
    if (isOpen) {
      loadEcosystems();
    }
  }, [isOpen]);

  const loadEcosystems = async () => {
    setIsLoadingEcosystems(true);
    setError(null);
    try {
      const data = await getEcosystems();
      setEcosystems(data.ecosystems.map(eco => ({ name: eco.name, slug: eco.slug })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ecosystems');
    } finally {
      setIsLoadingEcosystems(false);
    }
  };

  const onSubmit = async (data: AddRepositoryFormData) => {
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const tagsArray = (data.tags || '')
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await createProject({
        github_full_name: data.githubFullName.trim(),
        ecosystem_name: data.ecosystemName,
        language: data.language?.trim() || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        category: data.category?.trim() || undefined,
      });

      setSuccess(true);
      reset();

      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add repository');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setSuccess(false);
      reset();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`relative w-full max-w-[520px] rounded-[24px] border-2 shadow-[0_16px_64px_rgba(0,0,0,0.4)] transition-colors ${
        darkTheme
          ? 'bg-[#3a3228] border-white/30'
          : 'bg-[#d4c5b0] border-white/40'
      }`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-5 border-b-2 transition-colors ${
          darkTheme ? 'border-white/20' : 'border-white/30'
        }`}>
          <h2 className={`text-[20px] font-bold transition-colors ${
            darkTheme ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
          }`}>
            Add a Repository
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className={`p-2 rounded-[10px] transition-all ${
              darkTheme
                ? 'hover:bg-white/10 text-[#b8a898] hover:text-[#e8dfd0]'
                : 'hover:bg-white/20 text-[#7a6b5a] hover:text-[#2d2820]'
            } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className={`flex items-center gap-3 p-4 rounded-[12px] border-2 ${
              darkTheme
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : 'bg-red-100 border-red-300 text-red-700'
            }`}>
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-[14px] font-medium">{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className={`flex items-center gap-3 p-4 rounded-[12px] border-2 ${
              darkTheme
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-green-100 border-green-300 text-green-700'
            }`}>
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span className="text-[14px] font-medium">Repository added successfully!</span>
            </div>
          )}

          {/* Repository Name */}
          <div>
            <label 
              htmlFor="github-fullname-input"
              className={`block text-[14px] font-semibold mb-2 transition-colors ${
                darkTheme ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
              }`}
            >
              Repository Name <span className="text-red-500">*</span>
            </label>
            <input
              id="github-fullname-input"
              type="text"
              {...register('githubFullName')}
              placeholder="owner/repo (e.g., facebook/react)"
              disabled={isSubmitting}
              maxLength={140}
              aria-invalid={!!errors.githubFullName}
              aria-describedby={errors.githubFullName ? "github-fullname-error" : "github-fullname-help"}
              className={`w-full px-4 py-3 rounded-[12px] border-2 transition-all ${
                darkTheme
                  ? 'bg-white/10 border-white/20 text-[#e8dfd0] placeholder:text-[#b8a898] focus:border-[#c9983a] focus:bg-white/15'
                  : 'bg-white/40 border-white/50 text-[#2d2820] placeholder:text-[#7a6b5a] focus:border-[#c9983a] focus:bg-white/60'
              } ${errors.githubFullName ? 'border-red-500/50' : ''} ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.githubFullName && (
              <p
                id="github-fullname-error"
                role="alert"
                className={`mt-1.5 text-[12px] font-medium transition-colors ${
                  darkTheme ? 'text-red-400' : 'text-red-600'
                }`}
              >
                {errors.githubFullName.message}
              </p>
            )}
            <p
              id="github-fullname-help"
              className={`mt-1.5 text-[12px] transition-colors ${
                darkTheme ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
              }`}
            >
              Enter the full repository name in format: owner/repository. Owner name can contain letters, numbers, and hyphens (max 39 characters, no leading/trailing/consecutive hyphens). Repository name can contain letters, numbers, hyphens, underscores, and periods (max 100 characters).
            </p>
          </div>

          {/* Ecosystem */}
          <div>
            <label 
              htmlFor="ecosystem-select"
              className={`block text-[14px] font-semibold mb-2 transition-colors ${
                darkTheme ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
              }`}
            >
              Ecosystem <span className="text-red-500">*</span>
            </label>
            {isLoadingEcosystems ? (
              <SkeletonLoader className="h-12 w-full rounded-[12px]" />
            ) : (
              <Controller
                name="ecosystemName"
                control={control}
                render={({ field }) => (
                  <select
                    id="ecosystem-select"
                    {...field}
                    disabled={isSubmitting || ecosystems.length === 0}
                    aria-invalid={!!errors.ecosystemName}
                    aria-describedby={errors.ecosystemName ? "ecosystem-error" : undefined}
                    className={`w-full px-4 py-3 rounded-[12px] border-2 transition-all ${
                      darkTheme
                        ? 'bg-white/10 border-white/20 text-[#e8dfd0] focus:border-[#c9983a] focus:bg-white/15'
                        : 'bg-white/40 border-white/50 text-[#2d2820] focus:border-[#c9983a] focus:bg-white/60'
                    } ${errors.ecosystemName ? 'border-red-500/50' : ''} ${isSubmitting || ecosystems.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <option value="">Select an ecosystem</option>
                    {ecosystems.map((eco) => (
                      <option key={eco.slug} value={eco.name}>
                        {eco.name}
                      </option>
                    ))}
                  </select>
                )}
              />
            )}
            {errors.ecosystemName && (
              <p
                id="ecosystem-error"
                role="alert"
                className={`mt-1.5 text-[12px] font-medium transition-colors ${
                  darkTheme ? 'text-red-400' : 'text-red-600'
                }`}
              >
                {errors.ecosystemName.message}
              </p>
            )}
          </div>

          {/* Language */}
          <div>
            <label className={`block text-[14px] font-semibold mb-2 transition-colors ${
              darkTheme ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
            }`}>
              Language (Optional)
            </label>
            <input
              type="text"
              {...register('language')}
              placeholder="e.g., TypeScript, Go, Python"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-[12px] border-2 transition-all ${
                darkTheme
                  ? 'bg-white/10 border-white/20 text-[#e8dfd0] placeholder:text-[#b8a898] focus:border-[#c9983a] focus:bg-white/15'
                  : 'bg-white/40 border-white/50 text-[#2d2820] placeholder:text-[#7a6b5a] focus:border-[#c9983a] focus:bg-white/60'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={`block text-[14px] font-semibold mb-2 transition-colors ${
              darkTheme ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
            }`}>
              Tags (Optional)
            </label>
            <input
              type="text"
              {...register('tags')}
              placeholder="Comma-separated: good first issue, help wanted"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-[12px] border-2 transition-all ${
                darkTheme
                  ? 'bg-white/10 border-white/20 text-[#e8dfd0] placeholder:text-[#b8a898] focus:border-[#c9983a] focus:bg-white/15'
                  : 'bg-white/40 border-white/50 text-[#2d2820] placeholder:text-[#7a6b5a] focus:border-[#c9983a] focus:bg-white/60'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <p className={`mt-1.5 text-[12px] transition-colors ${
              darkTheme ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
            }`}>
              Separate multiple tags with commas
            </p>
          </div>

          {/* Category */}
          <div>
            <label className={`block text-[14px] font-semibold mb-2 transition-colors ${
              darkTheme ? 'text-[#e8dfd0]' : 'text-[#2d2820]'
            }`}>
              Category (Optional)
            </label>
            <input
              type="text"
              {...register('category')}
              placeholder="e.g., Frontend, Backend, Full Stack"
              disabled={isSubmitting}
              className={`w-full px-4 py-3 rounded-[12px] border-2 transition-all ${
                darkTheme
                  ? 'bg-white/10 border-white/20 text-[#e8dfd0] placeholder:text-[#b8a898] focus:border-[#c9983a] focus:bg-white/15'
                  : 'bg-white/40 border-white/50 text-[#2d2820] placeholder:text-[#7a6b5a] focus:border-[#c9983a] focus:bg-white/60'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={`flex-1 px-5 py-3 rounded-[12px] border-2 font-semibold text-[14px] transition-all ${
                darkTheme
                  ? 'bg-white/10 border-white/20 text-[#e8dfd0] hover:bg-white/15'
                  : 'bg-white/40 border-white/50 text-[#2d2820] hover:bg-white/60'
              } ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || success || !isValid}
              className={`flex-1 px-5 py-3 rounded-[12px] border-2 font-semibold text-[14px] transition-all ${
                darkTheme
                  ? 'bg-gradient-to-br from-[#c9983a]/40 to-[#d4af37]/30 border-[#c9983a]/70 text-[#fef5e7] hover:from-[#c9983a]/50 hover:to-[#d4af37]/40 shadow-[0_4px_16px_rgba(201,152,58,0.4)]'
                  : 'bg-gradient-to-br from-[#c9983a]/30 to-[#d4af37]/25 border-[#c9983a]/50 text-[#2d2820] hover:from-[#c9983a]/40 hover:to-[#d4af37]/35 shadow-[0_4px_16px_rgba(201,152,58,0.25)]'
              } ${isSubmitting || success ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding...
                </span>
              ) : success ? (
                'Added!'
              ) : (
                'Add Repository'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



