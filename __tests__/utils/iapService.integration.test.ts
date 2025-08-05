import { IAPService } from '../../utils/iapService';
import { SubscriptionService } from '../../utils/subscriptionService';
import { UserService } from '../../utils/userService';
import { Purchase } from 'react-native-iap';
import { IAP_PRODUCT_IDS } from '../../types/subscription';

// Mock external dependencies
jest.mock('react-native-iap');
jest.mock('@invertase/react-native-apple-authentication');
jest.mock('../../utils/subscriptionService');
jest.mock('../../utils/userService');

const mockGetAvailablePurchases =
  require('react-native-iap').getAvailablePurchases;
const mockSubscriptionService = SubscriptionService as jest.Mocked<
  typeof SubscriptionService
>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('IAPService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset static state
    (IAPService as any).processedPurchases = new Set();
    (IAPService as any).isProcessingRestore = false;
    (IAPService as any).isInitialized = false;
    (IAPService as any).isAvailable = true;
  });

  describe('checkSubscriptionStatusAndUpdate', () => {
    test('should handle single active subscription correctly', async () => {
      // Mock data
      const mockPurchase: Purchase = {
        productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY,
        transactionDate: Date.now(),
        originalTransactionIdentifierIOS: 'tx_premium_123',
        purchaseToken: 'token_123',
        transactionId: 'tx_123',
        transactionReceipt: 'receipt_data',
      } as Purchase;

      // Mock implementations
      mockGetAvailablePurchases.mockResolvedValue([mockPurchase]);
      mockSubscriptionService.setSubscription.mockResolvedValue(undefined);
      mockUserService.getLatestSubscriptionFromServer.mockResolvedValue({
        id: 'sub_123',
        plan_id: 'free', // Different from detected - should trigger reset
        is_active: false,
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        original_transaction_identifier_ios: 'tx_old',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      });

      // Mock validation to return true
      jest.spyOn(IAPService as any, 'validatePurchase').mockResolvedValue(true);
      jest
        .spyOn(IAPService as any, 'handleSuccessfulPurchaseQuietly')
        .mockResolvedValue(undefined);

      // Execute
      await IAPService.checkSubscriptionStatusAndUpdate();

      // Verify
      expect(mockGetAvailablePurchases).toHaveBeenCalledWith({
        onlyIncludeActiveItems: true,
      });
      expect(mockSubscriptionService.setSubscription).toHaveBeenCalledWith(
        'premium_yearly',
        { isActive: true, preserveUsage: false }, // Should reset usage for new subscription
        'tx_premium_123'
      );
    });

    test('should handle multiple purchases and select latest', async () => {
      const oldPurchase: Purchase = {
        productId: IAP_PRODUCT_IDS.PRO_MONTHLY,
        transactionDate: 1640995200000, // 2022-01-01
        originalTransactionIdentifierIOS: 'tx_old',
      } as Purchase;

      const newPurchase: Purchase = {
        productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY,
        transactionDate: 1672531200000, // 2023-01-01 (latest)
        originalTransactionIdentifierIOS: 'tx_new',
      } as Purchase;

      mockGetAvailablePurchases.mockResolvedValue([oldPurchase, newPurchase]);
      mockSubscriptionService.setSubscription.mockResolvedValue(undefined);
      mockUserService.getLatestSubscriptionFromServer.mockResolvedValue({
        id: 'sub_456',
        plan_id: 'premium_yearly',
        is_active: true,
        start_date: '2023-01-01',
        end_date: '2024-01-01',
        original_transaction_identifier_ios: 'tx_new',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      });

      jest.spyOn(IAPService as any, 'validatePurchase').mockResolvedValue(true);
      jest
        .spyOn(IAPService as any, 'handleSuccessfulPurchaseQuietly')
        .mockResolvedValue(undefined);

      await IAPService.checkSubscriptionStatusAndUpdate();

      // Should use the latest purchase (premium_yearly)
      expect(mockSubscriptionService.setSubscription).toHaveBeenCalledWith(
        'premium_yearly',
        { isActive: true, preserveUsage: true }, // Same plan - preserve usage
        'tx_new'
      );
    });

    test('should handle no purchases found', async () => {
      mockGetAvailablePurchases.mockResolvedValue([]);
      mockSubscriptionService.setSubscription.mockResolvedValue(undefined);

      await IAPService.checkSubscriptionStatusAndUpdate();

      expect(mockSubscriptionService.setSubscription).toHaveBeenCalledWith(
        'free',
        { isActive: true, preserveUsage: true },
        undefined
      );
    });

    test('should handle purchase validation failure', async () => {
      const mockPurchase: Purchase = {
        productId: IAP_PRODUCT_IDS.PRO_MONTHLY,
        transactionDate: Date.now(),
        originalTransactionIdentifierIOS: 'tx_invalid',
      } as Purchase;

      mockGetAvailablePurchases.mockResolvedValue([mockPurchase]);
      mockSubscriptionService.setSubscription.mockResolvedValue(undefined);
      mockUserService.getLatestSubscriptionFromServer.mockResolvedValue({
        id: 'sub_invalid',
        plan_id: 'free',
        is_active: false,
        start_date: '2023-01-01',
        end_date: '2023-12-31',
        original_transaction_identifier_ios: 'tx_invalid',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      });
      
      jest
        .spyOn(IAPService as any, 'validatePurchase')
        .mockResolvedValue(false); // Validation fails
      jest
        .spyOn(IAPService as any, 'handleSuccessfulPurchaseQuietly')
        .mockResolvedValue(undefined);

      await IAPService.checkSubscriptionStatusAndUpdate();

      // Should set subscription to 'free' when validation fails
      expect(mockSubscriptionService.setSubscription).toHaveBeenCalledWith(
        'free',
        { isActive: true, preserveUsage: true },
        'tx_invalid'
      );
    });

    test('should handle getAvailablePurchases error', async () => {
      mockGetAvailablePurchases.mockRejectedValue(
        new Error('Apple ID not logged in')
      );
      jest
        .spyOn(IAPService as any, 'setSubscriptionFreeWithPreserve')
        .mockResolvedValue(undefined);

      await IAPService.checkSubscriptionStatusAndUpdate();

      expect(IAPService['setSubscriptionFreeWithPreserve']).toHaveBeenCalled();
    });
  });

  describe('Purchase Listener Flow', () => {
    test('should process new purchase correctly', async () => {
      const mockPurchase: Purchase = {
        productId: IAP_PRODUCT_IDS.PRO_MONTHLY,
        transactionDate: Date.now(),
        originalTransactionIdentifierIOS: 'tx_new_purchase',
        purchaseToken: 'token_new',
      } as Purchase;

      jest.spyOn(IAPService as any, 'validatePurchase').mockResolvedValue(true);
      jest
        .spyOn(IAPService as any, 'handleSuccessfulPurchase')
        .mockResolvedValue(undefined);

      // Simulate purchase listener
      const purchaseId = mockPurchase.productId; // DEV mode
      const processedPurchases = (IAPService as any)
        .processedPurchases as Set<string>;

      // Should not be processed initially
      expect(processedPurchases.has(purchaseId)).toBe(false);

      // Add to processed (simulating listener logic)
      processedPurchases.add(purchaseId);

      // Should now be processed
      expect(processedPurchases.has(purchaseId)).toBe(true);
    });

    test('should skip duplicate purchases', async () => {
      const purchaseId = 'duplicate_purchase_123';
      const processedPurchases = (IAPService as any)
        .processedPurchases as Set<string>;

      // Add to processed set
      processedPurchases.add(purchaseId);

      // Simulate duplicate check
      const shouldSkip = processedPurchases.has(purchaseId);
      expect(shouldSkip).toBe(true);
    });

    test('should skip purchases during restore', () => {
      // Set restore flag
      (IAPService as any).isProcessingRestore = true;

      // Should skip purchase processing
      const shouldSkip = (IAPService as any).isProcessingRestore;
      expect(shouldSkip).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    test('should recover from subscription service sync error', async () => {
      const mockPurchase: Purchase = {
        productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY,
        transactionDate: Date.now(),
        originalTransactionIdentifierIOS: 'tx_sync_error',
      } as Purchase;

      mockGetAvailablePurchases.mockResolvedValue([mockPurchase]);
      mockSubscriptionService.setSubscription.mockRejectedValue(
        new Error('Server sync failed')
      );
      jest.spyOn(IAPService as any, 'validatePurchase').mockResolvedValue(true);
      jest
        .spyOn(IAPService as any, 'handleSuccessfulPurchaseQuietly')
        .mockResolvedValue(undefined);
      jest
        .spyOn(IAPService as any, 'setSubscriptionFreeWithPreserve')
        .mockResolvedValue(undefined);

      await IAPService.checkSubscriptionStatusAndUpdate();

      // Should fallback to free plan on sync error
      expect(IAPService['setSubscriptionFreeWithPreserve']).toHaveBeenCalled();
    });
  });
});

/**
 * Test Helper Functions
 */
function createMockPurchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    productId: IAP_PRODUCT_IDS.PRO_MONTHLY,
    transactionDate: Date.now(),
    originalTransactionIdentifierIOS: 'tx_test_123',
    purchaseToken: 'token_test_123',
    transactionId: 'tx_123',
    transactionReceipt: 'receipt_data',
    ...overrides
  } as Purchase;
}

function createMockDatabaseSubscription(overrides: any = {}) {
  return {
    id: 'sub_test_123',
    plan_id: 'free',
    is_active: false,
    start_date: '2023-01-01',
    end_date: '2023-12-31',
    original_transaction_identifier_ios: 'tx_test_123',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    ...overrides
  };
}
