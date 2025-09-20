/**
 * SubscriptionService Test Suite
 * Tests subscription management, usage tracking, and plan validation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SubscriptionService } from '../../utils/subscriptionService';
import { UserService, getDateString } from '../../utils/userService';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../utils/userService');

// Mock DeviceUsageService
jest.mock('../../utils/deviceUsageService', () => ({
  DeviceUsageService: {
    getCurrentUsageStats: jest.fn().mockResolvedValue({
      daily: { used: 0, limit: 100, remaining: 100 },
      total: 0,
    }),
    incrementUsageWithLimits: jest
      .fn()
      .mockResolvedValue({ allowed: true, newCount: 1 }),
  },
}));

// Mock sentryUtils to prevent dynamic import issues
jest.mock('../../utils/sentryUtils', () => ({
  updateSubscriptionContext: jest.fn().mockResolvedValue(undefined),
  captureSubscriptionError: jest.fn(),
  trackSubscriptionEvent: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('SubscriptionService', () => {
  const mockDate = '2025-01-15';

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock getDateString to return consistent date
    (getDateString as jest.Mock).mockReturnValue(mockDate);

    // Setup default mocks
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockUserService.getCurrentTransactionId.mockResolvedValue(null);
    mockUserService.getLatestSubscriptionFromServer.mockResolvedValue(null);
    mockUserService.getDailyUsage.mockResolvedValue(0);
    mockUserService.syncSubscription.mockResolvedValue(true);
    mockUserService.syncDailyUsage.mockResolvedValue(true);
  });

  describe('Subscription Management', () => {
    test('returns free subscription when none exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const subscription = await SubscriptionService.getCurrentSubscription();

      expect(subscription?.planId).toBe('free');
      expect(subscription?.isActive).toBe(true);
    });

    test('returns cached subscription from storage', async () => {
      const cachedSub = {
        planId: 'pro_monthly',
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        dailyUsage: {},
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(cachedSub));

      const subscription = await SubscriptionService.getCurrentSubscription();

      expect(subscription?.planId).toBe('pro_monthly');
    });

    test('sets subscription successfully', async () => {
      mockAsyncStorage.setItem.mockResolvedValue();

      await SubscriptionService.setSubscription(
        'pro_monthly',
        { isActive: true },
        'tx_123'
      );

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'user_subscription',
        expect.stringContaining('"planId":"pro_monthly"')
      );
    });

    test('validates plan ID before setting', async () => {
      await expect(
        SubscriptionService.setSubscription('invalid_plan' as any, {
          isActive: true,
        })
      ).rejects.toThrow('Invalid plan ID');
    });

    test('handles subscription update errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(
        SubscriptionService.setSubscription('pro_monthly', { isActive: true })
      ).rejects.toThrow('Storage error');
    });
  });

  describe('Usage Tracking', () => {
    test('allows unlimited usage for premium plans', async () => {
      const premiumSub = {
        planId: 'premium_yearly',
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        dailyUsage: {},
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(premiumSub));

      const result = await SubscriptionService.incrementDailyUsage();

      expect(result).toBe(true);
    });

    test('enforces limits for free plan', async () => {
      // Mock hitting usage limit
      const mockDeviceUsage =
        require('../../utils/deviceUsageService').DeviceUsageService;
      mockDeviceUsage.incrementUsageWithLimits.mockResolvedValue({
        allowed: false,
        newCount: 101,
      });

      const result = await SubscriptionService.incrementDailyUsage();

      expect(result).toBe(false);
    });

    test('handles usage sync errors gracefully', async () => {
      mockUserService.syncDailyUsage.mockRejectedValue(
        new Error('Network error')
      );

      // Should still succeed locally even if sync fails
      const result = await SubscriptionService.incrementDailyUsage();

      expect(typeof result).toBe('boolean');
    });
  });

  describe('Plan Validation', () => {
    test('validates subscription plan exists', async () => {
      // Test plan validation by checking if setSubscription accepts the plan
      await expect(
        SubscriptionService.setSubscription('free', { isActive: true })
      ).resolves.not.toThrow();

      await expect(
        SubscriptionService.setSubscription('invalid_plan' as any, {
          isActive: true,
        })
      ).rejects.toThrow();
    });

    test('checks if subscription is active', async () => {
      const activeSub = {
        planId: 'pro_monthly',
        isActive: true,
        startDate: new Date(Date.now() - 1000).toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        dailyUsage: {},
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(activeSub));

      const subscription = await SubscriptionService.getCurrentSubscription();

      expect(subscription?.isActive).toBe(true);
      expect(subscription?.planId).toBe('pro_monthly');
    });

    test('handles subscription without end date (lifetime)', async () => {
      const lifetimeSub = {
        planId: 'premium_yearly',
        isActive: true,
        startDate: new Date().toISOString(),
        endDate: null,
        dailyUsage: {},
      };
      mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(lifetimeSub));

      const subscription = await SubscriptionService.getCurrentSubscription();

      expect(subscription?.isActive).toBe(true);
      expect(subscription?.planId).toBe('premium_yearly');
    });
  });

  describe('Error Handling', () => {
    test('falls back to free subscription on storage errors', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const subscription = await SubscriptionService.getCurrentSubscription();

      expect(subscription?.planId).toBe('free');
      expect(subscription?.isActive).toBe(true);
    });

    test('handles malformed subscription data', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('invalid json');

      const subscription = await SubscriptionService.getCurrentSubscription();

      expect(subscription?.planId).toBe('free');
    });

    test('handles server sync errors gracefully', async () => {
      mockUserService.syncSubscription.mockRejectedValue(
        new Error('Network error')
      );

      // Should not throw error, just log and continue
      await expect(
        SubscriptionService.setSubscription('pro_monthly', { isActive: true })
      ).resolves.not.toThrow();
    });
  });

  describe('Concurrency Control', () => {
    test('prevents concurrent subscription fetches', async () => {
      // Mock slow response
      let resolvePromise: (value: any) => void;
      const slowPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockAsyncStorage.getItem.mockReturnValue(slowPromise as any);

      // Start two concurrent requests
      const promise1 = SubscriptionService.getCurrentSubscription();
      const promise2 = SubscriptionService.getCurrentSubscription();

      // Resolve the slow promise
      resolvePromise!(null);

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Should return the same result and only call storage once
      expect(result1).toEqual(result2);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledTimes(1);
    });

    test('queues subscription requests properly', async () => {
      // This test ensures that concurrent subscription operations don't interfere
      const promises = Array.from({ length: 3 }, () =>
        SubscriptionService.setSubscription('pro_monthly', { isActive: true })
      );

      await Promise.all(promises);

      // All operations should complete without error
      expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });
  });
});
