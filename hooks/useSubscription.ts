import { useState, useEffect, useCallback } from 'react';
import { SubscriptionService } from '../utils/subscriptionService';
import { UserSubscription } from '../types/subscription';

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null
  );
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [shouldShowAds, setShouldShowAds] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      const [currentSubscription, premiumStatus, adStatus] = await Promise.all([
        SubscriptionService.getCurrentSubscription(),
        SubscriptionService.isPremiumUser(),
        SubscriptionService.shouldShowAds(),
      ]);

      setSubscription(currentSubscription);
      setIsPremium(premiumStatus);
      setShouldShowAds(adStatus);
    } catch (error) {
      console.error('Error loading subscription:', error);
      // Set defaults on error
      setSubscription(null);
      setIsPremium(false);
      setShouldShowAds(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscription();
  }, [loadSubscription]);

  const refreshSubscription = useCallback(async () => {
    await loadSubscription();
  }, [loadSubscription]);

  return {
    subscription,
    isPremium,
    shouldShowAds,
    isLoading,
    refreshSubscription,
  };
};
