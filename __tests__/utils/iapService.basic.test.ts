/**
 * IAPService Real Method Tests
 * These tests call actual IAPService methods, not duplicated logic.
 */

import { IAPService } from '../../utils/iapService';

// IAPService에서 실제로 사용 가능한 public static 메서드들을 테스트
describe('IAPService - Real Method Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset IAPService static state
    (IAPService as any).isInitialized = false;
    (IAPService as any).isAvailable = false;
    (IAPService as any).processedPurchases = new Set();
    (IAPService as any).appleAuthState = {
      isLoggedIn: false,
      currentUser: null,
    };
  });

  describe('IAP Availability', () => {
    test('should return correct IAP availability status', () => {
      // Test actual method
      expect(IAPService.isIAPAvailable()).toBe(false);

      // Change internal state
      (IAPService as any).isAvailable = true;
      expect(IAPService.isIAPAvailable()).toBe(true);
    });
  });

  describe('Subscription Products', () => {
    test('should return simulation products when IAP not available', async () => {
      // Test actual method when IAP not available
      const products = await IAPService.getSubscriptionProducts();

      // Should return simulation products
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);

      // Check if simulation products have required structure
      const firstProduct = products[0];
      expect(firstProduct).toHaveProperty('productId');
      expect(firstProduct).toHaveProperty('title');
      expect(firstProduct).toHaveProperty('price');
    });

    test('should handle IAP initialization failure gracefully', async () => {
      // Mock initialization failure
      jest.spyOn(IAPService, 'initialize').mockResolvedValue(false);

      const products = await IAPService.getSubscriptionProducts();

      // Should still return simulation products
      expect(Array.isArray(products)).toBe(true);
      expect(products.length).toBeGreaterThan(0);
    });
  });

  describe('IAP Service Initialization', () => {
    test('should handle initialization with mocked dependencies', async () => {
      // Test actual initialization method
      const result = await IAPService.initialize();

      // With mocked dependencies, should initialize successfully
      expect(typeof result).toBe('boolean');

      // After initialization, should be available
      if (result) {
        expect(IAPService.isIAPAvailable()).toBe(true);
      }
    });

    test('should prevent multiple concurrent initializations', async () => {
      // Test concurrent initialization calls
      const promise1 = IAPService.initialize();
      const promise2 = IAPService.initialize();
      const promise3 = IAPService.initialize();

      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ]);

      // All should return the same result (no race conditions)
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('Subscription Status Management', () => {
    test('should handle subscription status check', async () => {
      // Test actual method
      await expect(
        IAPService.checkSubscriptionStatusAndUpdate()
      ).resolves.not.toThrow();
    });

    test('should set free subscription correctly', async () => {
      // Test actual method
      await expect(
        IAPService.setSubscriptionFreeWithPreserve()
      ).resolves.not.toThrow();
    });
  });

  describe('Purchase Restoration', () => {
    test('should handle restore purchases', async () => {
      // Test actual method
      const result = await IAPService.restorePurchases();

      // Should return boolean indicating success/failure
      expect(typeof result).toBe('boolean');
    });
  });

  describe('IAP Service Cleanup', () => {
    test('should cleanup resources properly', async () => {
      // Test actual cleanup method
      await expect(IAPService.cleanup()).resolves.not.toThrow();

      // After cleanup, should not be available
      expect(IAPService.isIAPAvailable()).toBe(false);
    });
  });
});
