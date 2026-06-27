import { useState, useEffect } from 'react';
import { Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { NotificationSettings } from '../../types';
import { NotificationSection } from './NotificationSection';
import { NotificationRow } from './NotificationRow';
import { useTheme } from '../../../../shared/contexts/ThemeContext';
import { getNotificationSettings, updateNotificationSettings } from '../../../../shared/api/client';

export function NotificationsTab() {
  const { theme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [updatingKeys, setUpdatingKeys] = useState<Record<string, boolean>>({});
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    // Global
    globalBillingEmail: false,
    globalBillingWeekly: false,
    globalMarketingEmail: false,
    globalMarketingWeekly: false,
    
    // Contributor
    contributorProjectEmail: false,
    contributorProjectWeekly: false,
    contributorRewardEmail: false,
    contributorRewardWeekly: false,
    contributorRewardAcceptedEmail: false,
    contributorRewardAcceptedWeekly: false,
    
    // Maintainer
    maintainerProjectContributorEmail: false,
    maintainerProjectContributorWeekly: false,
    maintainerProjectProgramEmail: false,
    maintainerProjectProgramWeekly: false,
    
    // Programs
    programsTransactionsEmail: false,
    programsTransactionsWeekly: false,
    
    // Sponsors
    sponsorsTransactionsEmail: false,
    sponsorsTransactionsWeekly: false,
  });

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const settings = await getNotificationSettings();
        if (active) {
          setNotifications(settings);
        }
      } catch (err) {
        if (active) {
          toast.error('Failed to load notification settings.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    fetchSettings();
    return () => {
      active = false;
    };
  }, []);

  const updateNotification = async (key: keyof NotificationSettings, value: boolean) => {
    const previousValue = notifications[key];
    
    // Optimistic Update
    setNotifications(prev => ({ ...prev, [key]: value }));
    setUpdatingKeys(prev => ({ ...prev, [key]: true }));

    try {
      const nextSettings = { ...notifications, [key]: value };
      await updateNotificationSettings(nextSettings);
    } catch (err) {
      // Revert on error
      setNotifications(prev => ({ ...prev, [key]: previousValue }));
      toast.error('Failed to update notification settings. Reverting change.');
    } finally {
      setUpdatingKeys(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const enableAll = async () => {
    const previousSettings = { ...notifications };
    const allEnabled = Object.keys(notifications).reduce((acc, key) => {
      acc[key as keyof NotificationSettings] = true;
      return acc;
    }, {} as NotificationSettings);

    setNotifications(allEnabled);
    const allKeysUpdating = Object.keys(notifications).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setUpdatingKeys(allKeysUpdating);

    try {
      await updateNotificationSettings(allEnabled);
      toast.success('All notifications enabled');
    } catch (err) {
      setNotifications(previousSettings);
      toast.error('Failed to enable all notifications. Reverting.');
    } finally {
      setUpdatingKeys({});
    }
  };

  const disableAll = async () => {
    const previousSettings = { ...notifications };
    const allDisabled = Object.keys(notifications).reduce((acc, key) => {
      acc[key as keyof NotificationSettings] = false;
      return acc;
    }, {} as NotificationSettings);

    setNotifications(allDisabled);
    const allKeysUpdating = Object.keys(notifications).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {} as Record<string, boolean>);
    setUpdatingKeys(allKeysUpdating);

    try {
      await updateNotificationSettings(allDisabled);
      toast.success('All notifications disabled');
    } catch (err) {
      setNotifications(previousSettings);
      toast.error('Failed to disable all notifications. Reverting.');
    } finally {
      setUpdatingKeys({});
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-300px)] min-h-[500px]">
        <Loader2 className="w-8 h-8 text-[#c9983a] animate-spin" aria-label="Loading settings" />
      </div>
    );
  }

  return (
    <div className="relative h-[calc(100vh-300px)] min-h-[500px] overflow-y-auto pr-2">
      <div className="space-y-6">
        {/* Header */}
        <div className={`backdrop-blur-[40px] rounded-[24px] border shadow-[0_8px_32px_rgba(0,0,0,0.08)] p-8 transition-colors ${
          theme === 'dark'
            ? 'bg-[#2d2820]/[0.4] border-white/10'
            : 'bg-white/[0.12] border-white/20'
        }`}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className={`text-[28px] font-bold mb-2 transition-colors ${
                theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
              }`}>Notification Preferences</h2>
              <p className={`text-[14px] transition-colors ${
                theme === 'dark' ? 'text-[#b8a898]' : 'text-[#7a6b5a]'
              }`}>Customize how you receive updates.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={enableAll}
                className={`px-5 py-2.5 rounded-[12px] backdrop-blur-[30px] border font-medium text-[14px] hover:bg-white/[0.25] transition-all ${
                  theme === 'dark'
                    ? 'bg-[#3d342c]/[0.5] border-white/20 text-[#d4c5b0]'
                    : 'bg-white/[0.2] border-white/30 text-[#2d2820]'
                }`}
              >
                Enable all
              </button>
              <button 
                onClick={disableAll}
                className={`px-5 py-2.5 rounded-[12px] backdrop-blur-[30px] border font-medium text-[14px] hover:bg-white/[0.25] transition-all ${
                  theme === 'dark'
                    ? 'bg-[#3d342c]/[0.5] border-white/20 text-[#d4c5b0]'
                    : 'bg-white/[0.2] border-white/30 text-[#2d2820]'
                }`}
              >
                Disable all
              </button>
            </div>
          </div>

          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_200px_220px] gap-4 pb-4 border-b border-white/10">
            <div></div>
            <div className={`text-[13px] font-semibold text-center transition-colors ${
              theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}>Email Notification</div>
            <div className={`text-[13px] font-semibold text-center flex items-center justify-center gap-2 transition-colors ${
              theme === 'dark' ? 'text-[#f5efe5]' : 'text-[#2d2820]'
            }`}>
              Weekly Summary Email
              <Info className={`w-4 h-4 transition-colors ${
                theme === 'dark' ? 'text-[#8a7e70]' : 'text-[#7a6b5a]'
              }`} />
            </div>
          </div>
        </div>

        {/* Global Section */}
        <NotificationSection title="Global">
          <NotificationRow
            title="Billing Profile"
            description="You now have billing profile with notifications for allocation reminders and identity checks."
            emailEnabled={notifications.globalBillingEmail}
            weeklyEnabled={notifications.globalBillingWeekly}
            emailDisabled={updatingKeys.globalBillingEmail}
            weeklyDisabled={updatingKeys.globalBillingWeekly}
            onEmailChange={(val) => updateNotification('globalBillingEmail', val)}
            onWeeklyChange={(val) => updateNotification('globalBillingWeekly', val)}
          />
          <NotificationRow
            title="Marketing"
            description="Receive updates and announcements sent occasionally by clicking the subscribe bar."
            emailEnabled={notifications.globalMarketingEmail}
            weeklyEnabled={notifications.globalMarketingWeekly}
            emailDisabled={updatingKeys.globalMarketingEmail}
            weeklyDisabled={updatingKeys.globalMarketingWeekly}
            onEmailChange={(val) => updateNotification('globalMarketingEmail', val)}
            onWeeklyChange={(val) => updateNotification('globalMarketingWeekly', val)}
            showBorder={false}
          />
        </NotificationSection>

        {/* Contributor Section */}
        <NotificationSection title="Contributor">
          <NotificationRow
            title="Project"
            description="Stay informed about project-related updates, including new published and available issues."
            emailEnabled={notifications.contributorProjectEmail}
            weeklyEnabled={notifications.contributorProjectWeekly}
            emailDisabled={updatingKeys.contributorProjectEmail}
            weeklyDisabled={updatingKeys.contributorProjectWeekly}
            onEmailChange={(val) => updateNotification('contributorProjectEmail', val)}
            onWeeklyChange={(val) => updateNotification('contributorProjectWeekly', val)}
          />
          <NotificationRow
            title="Reward"
            description="Receive updates on new billings and when rewards from issues to attention."
            emailEnabled={notifications.contributorRewardEmail}
            weeklyEnabled={notifications.contributorRewardWeekly}
            emailDisabled={updatingKeys.contributorRewardEmail}
            weeklyDisabled={updatingKeys.contributorRewardWeekly}
            onEmailChange={(val) => updateNotification('contributorRewardEmail', val)}
            onWeeklyChange={(val) => updateNotification('contributorRewardWeekly', val)}
          />
          <NotificationRow
            title="Reward"
            description="All rewards are open for your reward to evaluation."
            emailEnabled={notifications.contributorRewardAcceptedEmail}
            weeklyEnabled={notifications.contributorRewardAcceptedWeekly}
            emailDisabled={updatingKeys.contributorRewardAcceptedEmail}
            weeklyDisabled={updatingKeys.contributorRewardAcceptedWeekly}
            onEmailChange={(val) => updateNotification('contributorRewardAcceptedEmail', val)}
            onWeeklyChange={(val) => updateNotification('contributorRewardAcceptedWeekly', val)}
            showBorder={false}
          />
        </NotificationSection>

        {/* Maintainer Section */}
        <NotificationSection title="Maintainer">
          <NotificationRow
            title="Project + Contributor Data"
            description="Receive notifications upon new applications and contributions from contributors."
            emailEnabled={notifications.maintainerProjectContributorEmail}
            weeklyEnabled={notifications.maintainerProjectContributorWeekly}
            emailDisabled={updatingKeys.maintainerProjectContributorEmail}
            weeklyDisabled={updatingKeys.maintainerProjectContributorWeekly}
            onEmailChange={(val) => updateNotification('maintainerProjectContributorEmail', val)}
            onWeeklyChange={(val) => updateNotification('maintainerProjectContributorWeekly', val)}
          />
          <NotificationRow
            title="Project + Program"
            description="Get updates on new grants and contributor applications within your projects."
            emailEnabled={notifications.maintainerProjectProgramEmail}
            weeklyEnabled={notifications.maintainerProjectProgramWeekly}
            emailDisabled={updatingKeys.maintainerProjectProgramEmail}
            weeklyDisabled={updatingKeys.maintainerProjectProgramWeekly}
            onEmailChange={(val) => updateNotification('maintainerProjectProgramEmail', val)}
            onWeeklyChange={(val) => updateNotification('maintainerProjectProgramWeekly', val)}
            showBorder={false}
          />
        </NotificationSection>

        {/* Programs Section */}
        <NotificationSection title="Programs">
          <NotificationRow
            title="Transactions"
            description="Receive periodic updates about deposits & withdrawals."
            emailEnabled={notifications.programsTransactionsEmail}
            weeklyEnabled={notifications.programsTransactionsWeekly}
            emailDisabled={updatingKeys.programsTransactionsEmail}
            weeklyDisabled={updatingKeys.programsTransactionsWeekly}
            onEmailChange={(val) => updateNotification('programsTransactionsEmail', val)}
            onWeeklyChange={(val) => updateNotification('programsTransactionsWeekly', val)}
            showBorder={false}
          />
        </NotificationSection>

        {/* Sponsors Section */}
        <NotificationSection title="Sponsors">
          <NotificationRow
            title="Transactions"
            description="Get updates whenever spend about deposits & allocations."
            emailEnabled={notifications.sponsorsTransactionsEmail}
            weeklyEnabled={notifications.sponsorsTransactionsWeekly}
            emailDisabled={updatingKeys.sponsorsTransactionsEmail}
            weeklyDisabled={updatingKeys.sponsorsTransactionsWeekly}
            onEmailChange={(val) => updateNotification('sponsorsTransactionsEmail', val)}
            onWeeklyChange={(val) => updateNotification('sponsorsTransactionsWeekly', val)}
            showBorder={false}
          />
        </NotificationSection>
      </div>
    </div>
  );
}