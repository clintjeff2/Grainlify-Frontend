import { logger } from '../../../../shared/utils/logger';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Github, User, Upload, Link as LinkIcon } from 'lucide-react';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { getCurrentUser, updateProfile, updateAvatar, resyncGitHubProfile } from '../../../../shared/api/client';
import { toast } from 'sonner';
import { profileSchema, ProfileFormData } from './profileSchema';

interface CurrentUser {
  id: string;
  role: string;
  first_name?: string;
  last_name?: string;
  location?: string;
  website?: string;
  bio?: string;
  avatar_url?: string;
  telegram?: string;
  linkedin?: string;
  whatsapp?: string;
  twitter?: string;
  discord?: string;
  github?: {
    login: string;
    avatar_url: string;
    name?: string;
    email?: string;
    location?: string;
    bio?: string;
    website?: string;
  };
}

export function ProfileTab() {
  const { theme } = useTheme();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur',
    defaultValues: {
      firstName: '',
      lastName: '',
      location: '',
      website: '',
      bio: '',
      telegram: '',
      linkedin: '',
      whatsapp: '',
      twitter: '',
      discord: '',
    },
  });

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        // Derive first/last name from database or GitHub
        let fName = '';
        if (user.first_name) {
          fName = user.first_name;
        } else if (user.github?.name) {
          const nameParts = user.github.name.trim().split(/\s+/);
          if (nameParts.length > 0) {
            fName = nameParts[0];
          }
        }

        let lName = '';
        if (user.last_name) {
          lName = user.last_name;
        } else if (user.github?.name) {
          const nameParts = user.github.name.trim().split(/\s+/);
          if (nameParts.length > 1) {
            lName = nameParts.slice(1).join(' ');
          }
        }

        // Set avatar URL (database avatar_url takes precedence)
        if (user.avatar_url) {
          setAvatarUrl(user.avatar_url);
        } else if (user.github?.avatar_url) {
          setAvatarUrl(user.github.avatar_url);
        }

        const loc = user.location || user.github?.location || '';
        const web = user.website || user.github?.website || '';
        const b = user.bio || user.github?.bio || '';
        const tel = user.telegram || '';
        const li = user.linkedin || '';
        const wa = user.whatsapp || '';
        const tw = user.twitter || '';
        const di = user.discord || '';

        reset({
          firstName: fName,
          lastName: lName,
          location: loc,
          website: web,
          bio: b,
          telegram: tel,
          linkedin: li,
          whatsapp: wa,
          twitter: tw,
          discord: di,
        });
      } catch (error) {
        logger.error('Failed to fetch user data:', error);
        toast.error('Failed to fetch user data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, [reset]);

  const handleResync = async () => {
    setIsResyncing(true);
    try {
      const response = await resyncGitHubProfile();
      if (response?.github) {
        // Update current user state with fresh GitHub data
        setCurrentUser(prev => prev ? {
          ...prev,
          github: {
            ...prev.github,
            ...response.github,
          }
        } : null);
        toast.success('GitHub profile synced successfully!');
      }
    } catch (error) {
      logger.error('Failed to resync GitHub profile:', error);
      toast.error('Failed to resync GitHub profile. Please try again.');
    } finally {
      setIsResyncing(false);
    }
  };

  const handleEditGitHub = () => {
    // Open GitHub settings page in a new tab
    window.open('https://github.com/settings/profile', '_blank');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      alert('Please select a valid image file (SVG, PNG, JPG, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Convert to base64 data URL for preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatarUrl(base64String);
      // Don't upload yet - wait for user to click "Save Picture" button
    };
    reader.readAsDataURL(file);
  };

  const handleSaveAvatar = async () => {
    if (!avatarUrl) return;

    setIsSaving(true);
    try {
      await updateAvatar(avatarUrl);
      // Refetch user data to get updated avatar
      const user = await getCurrentUser();
      setCurrentUser(user);
      if (user.github?.avatar_url) {
        setAvatarUrl(user.github.avatar_url);
      }
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      logger.error('Failed to update avatar:', error);
      toast.error('Failed to update avatar. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    setIsSaving(true);
    try {
      await updateProfile({
        first_name: data.firstName || undefined,
        last_name: data.lastName || undefined,
        location: data.location || undefined,
        website: data.website || undefined,
        bio: data.bio || undefined,
        telegram: data.telegram || undefined,
        linkedin: data.linkedin || undefined,
        whatsapp: data.whatsapp || undefined,
        twitter: data.twitter || undefined,
        discord: data.discord || undefined,
      });
      // Refetch user data to get updated profile
      const user = await getCurrentUser();
      setCurrentUser(user);

      const loc = user.location || user.github?.location || '';
      const web = user.website || user.github?.website || '';
      const b = user.bio || user.github?.bio || '';
      const tel = user.telegram || '';
      const li = user.linkedin || '';
      const wa = user.whatsapp || '';
      const tw = user.twitter || '';
      const di = user.discord || '';

      reset({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        location: loc,
        website: web,
        bio: b,
        telegram: tel,
        linkedin: li,
        whatsapp: wa,
        twitter: tw,
        discord: di,
      });

      if (user.avatar_url) {
        setAvatarUrl(user.avatar_url);
      } else if (user.github?.avatar_url) {
        setAvatarUrl(user.github.avatar_url);
      }

      toast.success('Profile updated successfully!');
    } catch (error) {
      logger.error('Failed to update profile:', error);
      toast.error('Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${theme === 'dark'
        ? 'bg-[#2d2820]/[0.4] border-white/10'
        : 'bg-white/[0.12] border-white/20'
        }`}>
        <h2 className={`text-[28px] font-bold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>Profile</h2>
        <p className={`text-[14px] transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`}>You can edit all your information here.</p>
      </div>

      {/* GitHub Account Section */}
      <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${theme === 'dark'
        ? 'bg-[#2d2820]/[0.4] border-white/10'
        : 'bg-white/[0.12] border-white/20'
        }`}>
        <h3 className={`text-[20px] font-bold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>GitHub account</h3>
        <p className={`text-[14px] mb-6 transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`}>
          To change your username or email, edit your account on Github, then resync your account.
        </p>

        <div className={`flex items-center justify-between p-4 rounded-[16px] backdrop-blur-[30px] border transition-colors ${theme === 'dark'
          ? 'bg-[#3d342c]/[0.4] border-white/15'
          : 'bg-white/[0.15] border-white/25'
          }`}>
          <span className={`text-[15px] font-medium transition-colors ${theme === 'dark' ? 'text-[#d4c5b0]' : 'text-[#2d2820]'
            }`}>
            {isLoading ? (
              <span className="inline-block w-32 h-4 bg-white/10 rounded animate-pulse" />
            ) : currentUser?.github ? (
              `${currentUser.github.login} / ${currentUser.github.email || 'No email'}`
            ) : (
              'Not connected / Not connected'
            )}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={handleResync}
              disabled={isResyncing || !currentUser?.github}
              className={`px-5 py-2.5 rounded-[12px] backdrop-blur-[30px] border font-medium text-[14px] hover:bg-white/[0.25] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${theme === 'dark'
                ? 'bg-[#3d342c]/[0.5] border-white/20 text-[#d4c5b0]'
                : 'bg-white/[0.2] border-white/30 text-[#2d2820]'
                }`}
            >
              <Github className="w-4 h-4" />
              {isResyncing ? 'Syncing...' : 'Resync'}
            </button>
            <button
              onClick={handleEditGitHub}
              className="px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-medium text-[14px] shadow-[0_4px_16px_rgba(162,121,44,0.3)] hover:shadow-[0_6px_20px_rgba(162,121,44,0.4)] transition-all border border-white/10"
            >
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Profile Picture */}
      <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${theme === 'dark'
        ? 'bg-[#2d2820]/[0.4] border-white/10'
        : 'bg-white/[0.12] border-white/20'
        }`}>
        <h3 className={`text-[16px] font-bold mb-1 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>Profile Picture</h3>
        <p className={`text-[13px] mb-5 transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`}>SVG, PNG, JPG or GIF</p>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <div className="w-16 h-16 rounded-full bg-white/10 animate-pulse" />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover shadow-md border border-white/15"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#c9983a] to-[#a67c2e] flex items-center justify-center shadow-md border border-white/15">
              <User className="w-8 h-8 text-white" />
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/svg+xml,image/png,image/jpeg,image/jpg,image/gif"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`px-5 py-2.5 rounded-[12px] backdrop-blur-[30px] border font-medium text-[14px] hover:bg-white/[0.2] transition-all flex items-center gap-2 ${theme === 'dark'
              ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#d4c5b0]'
              : 'bg-white/[0.15] border-white/25 text-[#2d2820]'
              }`}
          >
            <Upload className="w-4 h-4" />
            Update
          </button>
          {avatarUrl && avatarUrl !== currentUser?.github?.avatar_url && (
            <button
              onClick={handleSaveAvatar}
              disabled={isSaving}
              className={`px-5 py-2.5 rounded-[12px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-medium text-[14px] shadow-[0_4px_16px_rgba(162,121,44,0.3)] hover:shadow-[0_6px_20px_rgba(162,121,44,0.4)] transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? 'Saving...' : 'Save Picture'}
            </button>
          )}
        </div>
      </div>

      {/* Personal Information */}
      <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${theme === 'dark'
        ? 'bg-[#2d2820]/[0.4] border-white/10'
        : 'bg-white/[0.12] border-white/20'
        }`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* First Name */}
          <div>
            <label htmlFor="first-name-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>First Name</label>
            <input
              id="first-name-input"
              type="text"
              placeholder="Enter your first name"
              {...register('firstName')}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? 'first-name-error' : undefined}
              className={`w-full px-4 py-3 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] ${theme === 'dark'
                ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
                : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
                } ${errors.firstName ? 'border-red-500/50' : ''}`}
            />
            {errors.firstName && (
              <p id="first-name-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div>
            <label htmlFor="last-name-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>Last Name</label>
            <input
              id="last-name-input"
              type="text"
              placeholder="Enter your last name"
              {...register('lastName')}
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? 'last-name-error' : undefined}
              className={`w-full px-4 py-3 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] ${theme === 'dark'
                ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
                : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
                } ${errors.lastName ? 'border-red-500/50' : ''}`}
            />
            {errors.lastName && (
              <p id="last-name-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.lastName.message}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label htmlFor="location-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>Location</label>
            <input
              id="location-input"
              type="text"
              placeholder="Enter your location"
              {...register('location')}
              aria-invalid={!!errors.location}
              aria-describedby={errors.location ? 'location-error' : undefined}
              className={`w-full px-4 py-3 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] ${theme === 'dark'
                ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
                : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
                } ${errors.location ? 'border-red-500/50' : ''}`}
            />
            {errors.location && (
              <p id="location-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.location.message}</p>
            )}
          </div>

          {/* Website */}
          <div>
            <label htmlFor="website-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>Website</label>
            <input
              id="website-input"
              type="text"
              placeholder="Enter your website"
              {...register('website')}
              aria-invalid={!!errors.website}
              aria-describedby={errors.website ? 'website-error' : undefined}
              className={`w-full px-4 py-3 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] ${theme === 'dark'
                ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
                : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
                } ${errors.website ? 'border-red-500/50' : ''}`}
            />
            {errors.website && (
              <p id="website-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.website.message}</p>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="mt-6">
          <label htmlFor="bio-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}>Bio</label>
          <textarea
            id="bio-input"
            placeholder="Enter your bio"
            rows={4}
            {...register('bio')}
            aria-invalid={!!errors.bio}
            aria-describedby={errors.bio ? 'bio-error' : undefined}
            className={`w-full px-4 py-3 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] resize-none ${theme === 'dark'
              ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
              : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
              } ${errors.bio ? 'border-red-500/50' : ''}`}
          />
          {errors.bio && (
            <p id="bio-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.bio.message}</p>
          )}
        </div>
      </div>

      {/* Contact Information */}
      <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${theme === 'dark'
        ? 'bg-[#2d2820]/[0.4] border-white/10'
        : 'bg-white/[0.12] border-white/20'
        }`}>
        <h3 className={`text-[20px] font-bold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
          }`}>Contact Information</h3>
        <p className={`text-[14px] mb-6 transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
          }`}>
          Please enter only your social networks handle (no links, no @ needed).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Telegram */}
          <div>
            <label htmlFor="telegram-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>Telegram</label>
            <div className="relative">
              <input
                id="telegram-input"
                type="text"
                {...register('telegram')}
                placeholder="Enter your telegram handle"
                aria-invalid={!!errors.telegram}
                aria-describedby={errors.telegram ? 'telegram-error' : undefined}
                className={`w-full px-4 py-3 pr-10 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] ${theme === 'dark'
                  ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
                  : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
                  } ${errors.telegram ? 'border-red-500/50' : ''}`}
              />
              <LinkIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === 'dark' ? 'text-[#8a7e70]' : 'text-[#7a6b5a]'
                }`} />
            </div>
            {errors.telegram && (
              <p id="telegram-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.telegram.message}</p>
            )}
          </div>

          {/* LinkedIn */}
          <div>
            <label htmlFor="linkedin-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>LinkedIn</label>
            <div className="relative">
              <input
                id="linkedin-input"
                type="text"
                {...register('linkedin')}
                placeholder="Enter your linkedin handle"
                aria-invalid={!!errors.linkedin}
                aria-describedby={errors.linkedin ? 'linkedin-error' : undefined}
                className={`w-full px-4 py-3 pr-10 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] ${theme === 'dark'
                  ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
                  : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
                  } ${errors.linkedin ? 'border-red-500/50' : ''}`}
              />
              <LinkIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
                }`} />
            </div>
            {errors.linkedin && (
              <p id="linkedin-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.linkedin.message}</p>
            )}
          </div>

          {/* WhatsApp */}
          <div>
            <label htmlFor="whatsapp-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>WhatsApp</label>
            <div className="relative">
              <input
                id="whatsapp-input"
                type="text"
                {...register('whatsapp')}
                placeholder="Enter your whatsApp handle"
                aria-invalid={!!errors.whatsapp}
                aria-describedby={errors.whatsapp ? 'whatsapp-error' : undefined}
                className={`w-full px-4 py-3 pr-10 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] ${theme === 'dark'
                  ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
                  : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
                  } ${errors.whatsapp ? 'border-red-500/50' : ''}`}
              />
              <LinkIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
                }`} />
            </div>
            {errors.whatsapp && (
              <p id="whatsapp-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.whatsapp.message}</p>
            )}
          </div>

          {/* Twitter */}
          <div>
            <label htmlFor="twitter-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>Twitter</label>
            <div className="relative">
              <input
                id="twitter-input"
                type="text"
                {...register('twitter')}
                placeholder="Enter your twitter handle"
                aria-invalid={!!errors.twitter}
                aria-describedby={errors.twitter ? 'twitter-error' : undefined}
                className={`w-full px-4 py-3 pr-10 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] ${theme === 'dark'
                  ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
                  : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
                  } ${errors.twitter ? 'border-red-500/50' : ''}`}
              />
              <LinkIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
                }`} />
            </div>
            {errors.twitter && (
              <p id="twitter-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.twitter.message}</p>
            )}
          </div>

          {/* Discord - Full Width */}
          <div className="md:col-span-2">
            <label htmlFor="discord-input" className={`block text-[14px] font-semibold mb-2 transition-colors ${theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>Discord</label>
            <div className="relative">
              <input
                id="discord-input"
                type="text"
                {...register('discord')}
                placeholder="Enter your discord handle"
                aria-invalid={!!errors.discord}
                aria-describedby={errors.discord ? 'discord-error' : undefined}
                className={`w-full px-4 py-3 pr-10 rounded-[14px] backdrop-blur-[30px] border focus:outline-none focus:bg-white/[0.2] focus:border-[#c9983a]/30 transition-all text-[14px] ${theme === 'dark'
                  ? 'bg-[#3d342c]/[0.4] border-white/15 text-[#f5efe5] placeholder-[#b8a898]'
                  : 'bg-white/[0.15] border-white/25 text-[#2d2820] placeholder-[#7a6b5a]'
                  } ${errors.discord ? 'border-red-500/50' : ''}`}
              />
              <LinkIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
                }`} />
            </div>
            {errors.discord && (
              <p id="discord-error" role="alert" className="mt-1.5 text-[12px] text-red-500">{errors.discord.message}</p>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isSaving || !isDirty || !isValid}
          className={`px-8 py-3 rounded-[16px] bg-gradient-to-br from-[#c9983a] to-[#a67c2e] text-white font-semibold text-[15px] shadow-[0_6px_24px_rgba(162,121,44,0.4)] hover:shadow-[0_8px_28px_rgba(162,121,44,0.5)] transition-all border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}