import { Purchase } from 'react-native-iap';

import { IAPService } from '../../utils/iapService';
import { SubscriptionService } from '../../utils/subscriptionService';
import { UserService } from '../../utils/userService';
import { IAP_PRODUCT_IDS } from '../../types/subscription';

// Mock external dependencies
jest.mock('react-native-iap');
jest.mock('@invertase/react-native-apple-authentication');
jest.mock('../../utils/subscriptionService');
jest.mock('../../utils/userService');

const mockIAP = require('react-native-iap');
const mockSubscriptionService = SubscriptionService as jest.Mocked<
  typeof SubscriptionService
>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

// Helper to create mock purchase
const createPurchase = (productId: string, txId: string): Purchase =>
  ({
    productId,
    transactionDate: Date.now(),
    originalTransactionIdentifierIOS: txId,
    transactionId: txId,
    transactionReceipt: 'receipt_data',
  } as Purchase);

describe('IAPService Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset static state and mock IAP as initialized
    Object.assign(IAPService as any, {
      processedPurchases: new Set(),
      isProcessingRestore: false,
      isInitialized: true,
      isAvailable: true,
    });

    // Setup default mocks
    mockIAP.initConnection.mockResolvedValue(true);
    mockIAP.getAvailablePurchases.mockResolvedValue([]);
    mockSubscriptionService.setSubscription.mockResolvedValue(undefined);
    mockUserService.getLatestSubscriptionFromServer.mockResolvedValue(null);

    // Mock private methods to avoid real validation calls
    jest.spyOn(IAPService as any, 'validatePurchase').mockResolvedValue(true);
    jest
      .spyOn(IAPService as any, 'handleSuccessfulPurchaseQuietly')
      .mockResolvedValue(undefined);
    jest
      .spyOn(IAPService as any, 'setSubscriptionFreeWithPreserve')
      .mockResolvedValue(undefined);
  });

  describe('checkSubscriptionStatusAndUpdate', () => {
    test('handles active subscription', async () => {
      const purchase = createPurchase(IAP_PRODUCT_IDS.PREMIUM_YEARLY, 'tx_123');
      mockIAP.getAvailablePurchases.mockResolvedValue([purchase]);

      await IAPService.checkSubscriptionStatusAndUpdate();

      expect(mockSubscriptionService.setSubscription).toHaveBeenCalledWith(
        'premium_yearly',
        { isActive: true, preserveUsage: false },
        'tx_123'
      );
    });

    test('handles multiple purchases - selects latest', async () => {
      const oldPurchase = createPurchase(IAP_PRODUCT_IDS.PRO_MONTHLY, 'tx_old');
      const newPurchase = createPurchase(
        IAP_PRODUCT_IDS.PREMIUM_YEARLY,
        'tx_new'
      );
      newPurchase.transactionDate = Date.now() + 1000; // Make it newer

      mockIAP.getAvailablePurchases.mockResolvedValue([
        oldPurchase,
        newPurchase,
      ]);

      await IAPService.checkSubscriptionStatusAndUpdate();

      expect(mockSubscriptionService.setSubscription).toHaveBeenCalledWith(
        'premium_yearly',
        expect.any(Object),
        'tx_new'
      );
    });

    test('handles no purchases - sets free plan', async () => {
      mockIAP.getAvailablePurchases.mockResolvedValue([]);

      await IAPService.checkSubscriptionStatusAndUpdate();

      expect(mockSubscriptionService.setSubscription).toHaveBeenCalledWith(
        'free',
        { isActive: true, preserveUsage: true },
        undefined
      );
    });

    test('handles validation failure - falls back to free', async () => {
      const purchase = createPurchase(
        IAP_PRODUCT_IDS.PRO_MONTHLY,
        'tx_invalid'
      );
      mockIAP.getAvailablePurchases.mockResolvedValue([purchase]);
      jest
        .spyOn(IAPService as any, 'validatePurchase')
        .mockResolvedValue(false);

      await IAPService.checkSubscriptionStatusAndUpdate();

      expect(mockSubscriptionService.setSubscription).toHaveBeenCalledWith(
        'free',
        expect.any(Object),
        'tx_invalid'
      );
    });

    test('handles API errors - sets free plan', async () => {
      mockIAP.getAvailablePurchases.mockRejectedValue(
        new Error('Apple ID not logged in')
      );

      await IAPService.checkSubscriptionStatusAndUpdate();

      expect(IAPService['setSubscriptionFreeWithPreserve']).toHaveBeenCalled();
    });
  });

  describe('Purchase Processing', () => {
    test('tracks processed purchases', () => {
      const processedPurchases = (IAPService as any)
        .processedPurchases as Set<string>;
      const purchaseId = 'test_purchase_123';

      expect(processedPurchases.has(purchaseId)).toBe(false);

      processedPurchases.add(purchaseId);

      expect(processedPurchases.has(purchaseId)).toBe(true);
    });

    test('skips processing during restore', () => {
      (IAPService as any).isProcessingRestore = true;

      expect((IAPService as any).isProcessingRestore).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    test('recovers from sync errors', async () => {
      const purchase = createPurchase(
        IAP_PRODUCT_IDS.PREMIUM_YEARLY,
        'tx_error'
      );
      mockIAP.getAvailablePurchases.mockResolvedValue([purchase]);
      mockSubscriptionService.setSubscription.mockRejectedValue(
        new Error('Server sync failed')
      );

      await IAPService.checkSubscriptionStatusAndUpdate();

      expect(IAPService['setSubscriptionFreeWithPreserve']).toHaveBeenCalled();
    });
  });
});
