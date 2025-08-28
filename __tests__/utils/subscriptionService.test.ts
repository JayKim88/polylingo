/**
 * SubscriptionService Test Suite
 * 
 * Tests subscription management and usage tracking including:
 * - Daily usage tracking by timezone
 * - Subscription tier validation and access control  
 * - Premium feature access logic
 * - Renewal detection during active usage
 * - Free/Pro/Premium tier behavior
 * - Server synchronization and error handling
 * - Race condition prevention
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionService } from '../../utils/subscriptionService';
import { UserSubscription, SUBSCRIPTION_PLANS } from '../../types/subscription';
import { UserService, getDateString } from '../../utils/userService';
import { DeviceUsageService } from '../../utils/deviceUsageService';
import { IAPService } from '../../utils/iapService';

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../utils/userService');
jest.mock('../../utils/deviceUsageService');
jest.mock('../../utils/iapService');
jest.mock('../../utils/sentryUtils', () => ({
  updateSubscriptionContext: jest.fn()
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockDeviceUsageService = DeviceUsageService as jest.Mocked<typeof DeviceUsageService>;
const mockIAPService = IAPService as jest.Mocked<typeof IAPService>;

// Mock the dynamic import for sentryUtils
jest.mock('../../utils/sentryUtils', () => ({
  updateSubscriptionContext: jest.fn().mockResolvedValue(undefined)
}));

describe('SubscriptionService', () => {
  const mockDate = '2025-01-15';
  const mockTimestamp = 1640995200000;

  const mockFreeSubscription: UserSubscription = {
    planId: 'free',
    isActive: true,
    startDate: mockTimestamp,
    endDate: 0,
    dailyUsage: {
      date: mockDate,
      count: 0
    },
    isTrialUsed: false,
    originalTransactionIdentifierIOS: undefined
  };

  const mockProSubscription: UserSubscription = {
    planId: 'pro_monthly',
    isActive: true,
    startDate: mockTimestamp,
    endDate: mockTimestamp + (30 * 24 * 60 * 60 * 1000), // 30 days
    dailyUsage: {
      date: mockDate,
      count: 0
    },
    isTrialUsed: false,
    originalTransactionIdentifierIOS: 'tx_123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset static state
    (SubscriptionService as any).isUpdating = false;
    (SubscriptionService as any).subscriptionPromise = null;
    
    // Mock getDateString to return consistent date
    (getDateString as jest.Mock).mockReturnValue(mockDate);
    
    // Mock default responses
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockUserService.getCurrentTransactionId.mockResolvedValue(null);
    mockUserService.getLatestSubscriptionFromServer.mockResolvedValue(null);
    mockUserService.getDailyUsage.mockResolvedValue(null);
    mockUserService.updateSubscription.mockResolvedValue(undefined);
    mockDeviceUsageService.getDailyUsage.mockResolvedValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Current Subscription Management', () => {
    test('should return free subscription when no subscription exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      
      const subscription = await SubscriptionService.getCurrentSubscription();
      
      expect(subscription).toEqual(expect.objectContaining({
        planId: 'free',
        isActive: true
      }));
    });

    test('should return cached subscription from AsyncStorage', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockProSubscription));
      
      const subscription = await SubscriptionService.getCurrentSubscription();
      
      expect(subscription).toEqual(mockProSubscription);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('user_subscription');
    });

    test('should prevent concurrent subscription fetches', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockFreeSubscription));
      
      // Start two concurrent requests
      const promise1 = SubscriptionService.getCurrentSubscription();
      const promise2 = SubscriptionService.getCurrentSubscription();
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      // Both should return the same result
      expect(result1).toEqual(result2);
      // AsyncStorage should only be called once due to promise caching
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });

    test('should return local data when updating', async () => {
      // Set updating flag
      (SubscriptionService as any).isUpdating = true;
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockProSubscription));
      
      const subscription = await SubscriptionService.getCurrentSubscription();
      
      expect(subscription).toEqual(mockProSubscription);
      // Should not fetch from server when updating
      expect(mockUserService.getLatestSubscriptionFromServer).not.toHaveBeenCalled();
    });

    test('should fetch server subscription when transaction ID available', async () => {
      const serverSubscription = {
        plan_id: 'pro_monthly',
        is_active: true,
        start_date: mockTimestamp,
        end_date: mockTimestamp + (30 * 24 * 60 * 60 * 1000)
      };
      
      mockUserService.getCurrentTransactionId.mockResolvedValue('tx_123');
      mockUserService.getLatestSubscriptionFromServer.mockResolvedValue(serverSubscription);
      
      const subscription = await SubscriptionService.getCurrentSubscription();
      
      expect(subscription?.planId).toBe('pro_monthly');
      expect(mockUserService.getLatestSubscriptionFromServer).toHaveBeenCalledWith('tx_123');
    });
  });

  describe('Subscription Updates', () => {
    test('should set subscription successfully', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();
      mockUserService.updateSubscription.mockResolvedValue();
      
      await SubscriptionService.setSubscription('pro_monthly', {
        isActive: true,
        originalTransactionIdentifierIOS: 'tx_123'
      });
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'user_subscription',
        expect.stringContaining('"planId":"pro_monthly"')
      );
      expect(mockUserService.updateSubscription).toHaveBeenCalled();
    });

    test('should validate plan ID before setting', async () => {
      await expect(
        SubscriptionService.setSubscription('invalid_plan', {})
      ).rejects.toThrow('Invalid plan ID');
      
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    test('should preserve usage when option is set', async () => {
      const existingSubscription = {
        ...mockProSubscription,
        dailyUsage: { date: mockDate, count: 5 }
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSubscription));
      mockAsyncStorage.setItem.mockResolvedValue();
      mockUserService.updateSubscription.mockResolvedValue();
      
      await SubscriptionService.setSubscription('pro_max_monthly', {
        preserveUsage: true
      });
      
      // Should preserve the usage count
      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.dailyUsage.count).toBe(5);
    });

    test('should reset usage for new plans when preserveUsage is false', async () => {
      const existingSubscription = {
        ...mockProSubscription,
        dailyUsage: { date: mockDate, count: 5 }
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSubscription));
      mockAsyncStorage.setItem.mockResolvedValue();
      mockUserService.updateSubscription.mockResolvedValue();
      
      await SubscriptionService.setSubscription('premium_yearly', {
        preserveUsage: false
      });
      
      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.dailyUsage.count).toBe(0);
    });

    test('should handle subscription update errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      await expect(
        SubscriptionService.setSubscription('pro_monthly', {})
      ).rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error setting subscription:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    test('should update Sentry context on successful subscription update', async () => {
      const { updateSubscriptionContext } = await import('../../utils/sentryUtils');
      
      mockAsyncStorage.setItem.mockResolvedValue();
      mockUserService.updateSubscription.mockResolvedValue();
      
      await SubscriptionService.setSubscription('pro_monthly', {});
      
      expect(updateSubscriptionContext).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'pro_monthly' })
      );
    });
  });

  describe('Usage Tracking', () => {
    test('should check if usage is allowed for free plan', async () => {
      const freeSubscription = { ...mockFreeSubscription, dailyUsage: { date: mockDate, count: 15 } };
      mockAsyncStorage.getItem.mkResolvedValue(JSON.stringify(freeSubscription));
      
      const canUse = await SubscriptionService.canUseTranslation();
      
      expect(canUse).toBe(false); // Free plan limit is 10
    });

    test('should allow unlimited usage for premium plans', async () => {
      const premiumSubscription = {
        ...mockProSubscription,
        planId: 'premium_yearly',
        dailyUsage: { date: mockDate, count: 1000 }
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(premiumSubscription));
      
      const canUse = await SubscriptionService.canUseTranslation();
      
      expect(canUse).toBe(true);
    });

    test('should increment usage count', async () => {
      const subscription = { ...mockFreeSubscription, dailyUsage: { date: mockDate, count: 5 } };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(subscription));
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await SubscriptionService.incrementUsage();
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'user_subscription',
        expect.stringContaining('"count":6')
      );
    });

    test('should reset daily usage for new day', async () => {
      const oldSubscription = {
        ...mockFreeSubscription,
        dailyUsage: { date: '2025-01-14', count: 10 }
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(oldSubscription));
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await SubscriptionService.incrementUsage();
      
      // Should reset to 1 for new day
      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.dailyUsage.count).toBe(1);
      expect(savedData.dailyUsage.date).toBe(mockDate);
    });

    test('should get remaining usage count', async () => {
      const subscription = { ...mockFreeSubscription, dailyUsage: { date: mockDate, count: 7 } };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(subscription));
      
      const remaining = await SubscriptionService.getRemainingUsage();
      
      expect(remaining).toBe(3); // 10 - 7 = 3 for free plan
    });

    test('should return unlimited for premium plans', async () => {
      const premiumSubscription = { ...mockProSubscription, planId: 'premium_yearly' };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(premiumSubscription));
      
      const remaining = await SubscriptionService.getRemainingUsage();
      
      expect(remaining).toBe(-1); // -1 indicates unlimited
    });
  });

  describe('Plan Validation and Access Control', () => {
    test('should validate subscription plan exists', async () => {
      const validPlans = ['free', 'pro_monthly', 'pro_max_monthly', 'premium_yearly'];
      
      for (const planId of validPlans) {
        const plan = SUBSCRIPTION_PLANS.find(p => p.id === planId);
        expect(plan).toBeDefined();
      }
    });

    test('should check if subscription is active', async () => {
      const expiredSubscription = {
        ...mockProSubscription,
        endDate: mockTimestamp - (24 * 60 * 60 * 1000) // Yesterday
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredSubscription));
      
      const subscription = await SubscriptionService.getCurrentSubscription();
      
      // Service should detect expired subscription and return free plan
      expect(subscription?.planId).toBe('free');
    });

    test('should handle subscription without end date (lifetime)', async () => {
      const lifetimeSubscription = {
        ...mockProSubscription,
        endDate: 0
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(lifetimeSubscription));
      
      const subscription = await SubscriptionService.getCurrentSubscription();
      
      expect(subscription?.isActive).toBe(true);
    });
  });

  describe('Server Synchronization', () => {
    test('should sync usage to server', async () => {
      const subscription = { ...mockProSubscription, dailyUsage: { date: mockDate, count: 5 } };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(subscription));
      mockDeviceUsageService.syncUsageToServer.mockResolvedValue();
      
      await SubscriptionService.syncUsageToServer();
      
      expect(mockDeviceUsageService.syncUsageToServer).toHaveBeenCalledWith(5, 'tx_123');
    });

    test('should handle server sync errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const subscription = { ...mockProSubscription, dailyUsage: { date: mockDate, count: 5 } };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(subscription));
      mockDeviceUsageService.syncUsageToServer.mockRejectedValue(new Error('Network error'));
      
      await SubscriptionService.syncUsageToServer();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error syncing usage to server:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    test('should get server usage data', async () => {
      mockUserService.getDailyUsage.mockResolvedValue(15);
      
      const usage = await SubscriptionService.getServerUsage('tx_123');
      
      expect(usage).toBe(15);
      expect(mockUserService.getDailyUsage).toHaveBeenCalledWith(mockDate, 'tx_123');
    });
  });

  describe('Free Plan Conversion', () => {
    test('should set free subscription preserving trial status', async () => {
      const existingSubscription = {
        ...mockProSubscription,
        isTrialUsed: true
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(existingSubscription));
      mockAsyncStorage.setItem.mockResolvedValue();
      mockUserService.updateSubscription.mockResolvedValue();
      
      await SubscriptionService.setSubscriptionFreeWithPreserve();
      
      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.planId).toBe('free');
      expect(savedData.isTrialUsed).toBe(true);
      expect(savedData.dailyUsage.count).toBe(0); // Usage should reset
    });
  });

  describe('Subscription Status Checks', () => {
    test('should detect expired subscription during active usage', async () => {
      const expiredSubscription = {
        ...mockProSubscription,
        endDate: Date.now() - 1000 // 1 second ago
      };
      
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(expiredSubscription));
      mockIAPService.checkSubscriptionStatusAndUpdate.mockResolvedValue();
      
      const canUse = await SubscriptionService.canUseTranslation();
      
      // Should trigger subscription status check for expired subscription
      expect(mockIAPService.checkSubscriptionStatusAndUpdate).toHaveBeenCalled();
      expect(canUse).toBe(false); // Should fallback to free plan limits
    });

    test('should handle subscription renewal detection', async () => {
      const renewedSubscription = {
        plan_id: 'pro_monthly',
        is_active: true,
        start_date: Date.now(),
        end_date: Date.now() + (30 * 24 * 60 * 60 * 1000)
      };
      
      mockUserService.getCurrentTransactionId.mockResolvedValue('tx_123');
      mockUserService.getLatestSubscriptionFromServer.mockResolvedValue(renewedSubscription);
      mockAsyncStorage.setItem.mockResolvedValue();
      
      const subscription = await SubscriptionService.getCurrentSubscription();
      
      expect(subscription?.planId).toBe('pro_monthly');
      expect(subscription?.isActive).toBe(true);
    });
  });

  describe('Timezone-Aware Usage Tracking', () => {
    test('should use local timezone for daily usage tracking', () => {
      const dateString = getDateString();
      expect(typeof dateString).toBe('string');
      expect(dateString).toMatch(/^\d{4}-\d{2}-\d{2}$/); // YYYY-MM-DD format
    });

    test('should handle timezone changes correctly', async () => {
      // Mock different date for timezone test
      (getDateString as jest.Mock).mockReturnValueOnce('2025-01-16');
      
      const subscription = { ...mockFreeSubscription, dailyUsage: { date: '2025-01-15', count: 10 } };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(subscription));
      mockAsyncStorage.setItem.mockResolvedValue();
      
      await SubscriptionService.incrementUsage();
      
      // Should reset for new date
      const savedData = JSON.parse(
        (mockAsyncStorage.setItem as jest.Mock).mock.calls[0][1]
      );
      expect(savedData.dailyUsage.date).toBe('2025-01-16');
      expect(savedData.dailyUsage.count).toBe(1);
    });
  });

  describe('Error Handling', () => {
    test('should fallback to free subscription on storage errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      
      const subscription = await SubscriptionService.getCurrentSubscription();
      
      expect(subscription?.planId).toBe('free');
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle malformed subscription data', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');
      
      const subscription = await SubscriptionService.getCurrentSubscription();
      
      expect(subscription?.planId).toBe('free');
      
      consoleErrorSpy.mockRestore();
    });

    test('should prevent usage increment on storage errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockFreeSubscription));
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      
      await SubscriptionService.incrementUsage();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error incrementing usage:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Race Condition Prevention', () => {
    test('should prevent concurrent subscription updates', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();
      mockUserService.updateSubscription.mockResolvedValue();
      
      // Start two concurrent updates
      const promise1 = SubscriptionService.setSubscription('pro_monthly', {});
      const promise2 = SubscriptionService.setSubscription('pro_max_monthly', {});
      
      // Both should complete without errors
      await Promise.all([promise1, promise2]);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(2);
    });

    test('should queue subscription requests properly', async () => {
      let resolveFirst: () => void;
      const firstPromise = new Promise<void>(resolve => {
        resolveFirst = resolve;
      });
      
      mockAsyncStorage.getItem.mockImplementation(() => firstPromise.then(() => JSON.stringify(mockFreeSubscription)));
      
      // Start multiple concurrent requests
      const request1 = SubscriptionService.getCurrentSubscription();
      const request2 = SubscriptionService.getCurrentSubscription();
      const request3 = SubscriptionService.getCurrentSubscription();
      
      // Resolve the first promise
      resolveFirst!();
      
      const results = await Promise.all([request1, request2, request3]);
      
      // All should return the same result
      expect(results[0]).toEqual(results[1]);
      expect(results[1]).toEqual(results[2]);
      
      // Storage should only be accessed once due to promise caching
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });
  });
});