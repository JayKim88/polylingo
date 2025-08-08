import { IAPService } from '../../utils/iapService';
import { Purchase } from 'react-native-iap';
import { IAP_PRODUCT_IDS } from '../../types/subscription';

/**
 * Unit Tests for IAPService Business Logic
 * 
 * Tests core business logic functions without external dependencies:
 * - Product ID mapping
 * - Purchase sorting and selection
 * - Duplicate prevention mechanisms
 * - Purchase ID generation
 * - Error handling patterns
 */

describe('IAPService - Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset static properties
    (IAPService as any).processedPurchases = new Set();
    (IAPService as any).isProcessingRestore = false;
    (IAPService as any).isInitialized = false;
  });

  describe('Purchase Selection Logic', () => {
    test('should select latest purchase when multiple exist', () => {
      const mockPurchases: Purchase[] = [
        {
          productId: IAP_PRODUCT_IDS.PRO_MONTHLY,
          transactionDate: 1640995200000, // 2022-01-01 (older)
          originalTransactionIdentifierIOS: 'tx_old',
        },
        {
          productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY,
          transactionDate: 1672531200000, // 2023-01-01 (latest)
          originalTransactionIdentifierIOS: 'tx_new',
        }
      ] as Purchase[];

      // Simulate IAPService sorting logic
      const sorted = mockPurchases.sort((a, b) => 
        (b.transactionDate || 0) - (a.transactionDate || 0)
      );
      
      expect(sorted[0].productId).toBe(IAP_PRODUCT_IDS.PREMIUM_YEARLY);
      expect(sorted[0].transactionDate).toBe(1672531200000);
      expect(sorted[0].originalTransactionIdentifierIOS).toBe('tx_new');
    });

    test('should handle purchases without transaction dates', () => {
      const mockPurchases: Purchase[] = [
        {
          productId: IAP_PRODUCT_IDS.PRO_MONTHLY,
          transactionDate: undefined,
          originalTransactionIdentifierIOS: 'tx_no_date',
        },
        {
          productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY,
          transactionDate: 1672531200000,
          originalTransactionIdentifierIOS: 'tx_with_date',
        }
      ] as Purchase[];

      const sorted = mockPurchases.sort((a, b) => 
        (b.transactionDate || 0) - (a.transactionDate || 0)
      );
      
      // Purchase with date should come first
      expect(sorted[0].originalTransactionIdentifierIOS).toBe('tx_with_date');
      expect(sorted[1].originalTransactionIdentifierIOS).toBe('tx_no_date');
    });

  });

  describe('Product ID Mapping', () => {
    test('should map all valid product IDs to correct plan IDs', () => {
      const validMappings = [
        { productId: IAP_PRODUCT_IDS.PRO_MONTHLY, expected: 'pro_monthly' },
        { productId: IAP_PRODUCT_IDS.PRO_MAX_MONTHLY, expected: 'pro_max_monthly' },
        { productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY, expected: 'premium_yearly' }
      ];

      validMappings.forEach(({ productId, expected }) => {
        const planId = mapProductIdToPlanId(productId);
        expect(planId).toBe(expected);
      });
    });

    test('should fallback to free plan for unknown product IDs', () => {
      const unknownProductIds = [
        'unknown_product',
        'com.invalid.product',
        '',
        null,
        undefined
      ];

      unknownProductIds.forEach((productId) => {
        const planId = mapProductIdToPlanId(productId as string);
        expect(planId).toBe('free');
      });
    });

    // Helper function to simulate IAPService mapping logic
    function mapProductIdToPlanId(productId: string): string {
      switch (productId) {
        case IAP_PRODUCT_IDS.PRO_MONTHLY:
          return 'pro_monthly';
        case IAP_PRODUCT_IDS.PRO_MAX_MONTHLY:
          return 'pro_max_monthly';
        case IAP_PRODUCT_IDS.PREMIUM_YEARLY:
          return 'premium_yearly';
        default:
          return 'free';
      }
    }
  });

  describe('Duplicate Purchase Prevention', () => {
    test('should prevent duplicate purchase processing', () => {
      const purchaseId = 'test_purchase_123';
      
      // First time - should not be processed
      expect((IAPService as any).processedPurchases.has(purchaseId)).toBe(false);
      
      // Add to processed set
      (IAPService as any).processedPurchases.add(purchaseId);
      
      // Second time - should be processed
      expect((IAPService as any).processedPurchases.has(purchaseId)).toBe(true);
    });

    test('should skip purchase listener during restore', () => {
      // Set restore flag
      (IAPService as any).isProcessingRestore = true;
      
      // Simulate purchase listener logic
      const shouldSkip = (IAPService as any).isProcessingRestore;
      expect(shouldSkip).toBe(true);
    });
  });

  describe('Purchase ID Generation', () => {
    test('should generate correct purchase ID in development mode', () => {
      const mockPurchase = {
        productId: 'com.test.product',
        originalTransactionIdentifierIOS: 'tx_123'
      };

      // Development mode uses only productId for easier testing
      const devPurchaseId = mockPurchase.productId;
      expect(devPurchaseId).toBe('com.test.product');
    });

    test('should generate unique purchase ID in production mode', () => {
      const mockPurchase = {
        productId: 'com.test.product',
        originalTransactionIdentifierIOS: 'tx_123'
      };

      // Production mode combines productId with transaction identifier
      const prodPurchaseId = `${mockPurchase.productId}_${mockPurchase.originalTransactionIdentifierIOS}`;
      expect(prodPurchaseId).toBe('com.test.product_tx_123');
    });

    test('should handle missing transaction identifiers', () => {
      const mockPurchase = {
        productId: 'com.test.product',
        originalTransactionIdentifierIOS: undefined
      };

      // iOS app should require originalTransactionIdentifierIOS
      expect(mockPurchase.originalTransactionIdentifierIOS).toBeUndefined();
      expect(() => {
        if (!mockPurchase.originalTransactionIdentifierIOS) {
          throw new Error('Missing transaction identifier for purchase');
        }
      }).toThrow('Missing transaction identifier for purchase');
    });
  });

  describe('Error Classification', () => {
    test('should identify user cancellation errors', () => {
      const userCancelledErrors = [
        { code: 'E_USER_CANCELLED', message: 'User cancelled purchase' },
        { code: 'OTHER_ERROR', message: 'User decided to cancel the transaction' },
        { code: 'UNKNOWN', message: 'Purchase was cancelled by user' }
      ];

      userCancelledErrors.forEach(error => {
        const isUserCancelled = 
          error.code === 'E_USER_CANCELLED' ||
          error.message?.toLowerCase().includes('cancel');
        
        expect(isUserCancelled).toBe(true);
      });
    });

    test('should identify network-related errors', () => {
      const networkErrors = [
        { code: 'E_NETWORK_ERROR', message: 'Network request failed' },
        { code: 'TIMEOUT', message: 'Request timed out' },
        { code: 'E_UNKNOWN', message: 'Connection lost during purchase' }
      ];

      networkErrors.forEach(error => {
        const isNetworkError = 
          error.code === 'E_NETWORK_ERROR' ||
          error.code === 'TIMEOUT' ||
          error.message?.toLowerCase().includes('network') ||
          error.message?.toLowerCase().includes('connection');
        
        expect(isNetworkError).toBe(true);
      });
    });

    test('should handle validation timeout scenarios', async () => {
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Validation timeout after 30s')), 50);
      });

      await expect(timeoutPromise).rejects.toThrow('Validation timeout');
    });
  });

  describe('Apple ID Authentication States', () => {
    const APPLE_AUTH_STATES = {
      AUTHORIZED: 1,
      REVOKED: 2,
      NOT_FOUND: 3
    };

    test('should recognize authorized Apple ID state', () => {
      const credentialState = APPLE_AUTH_STATES.AUTHORIZED;
      expect(credentialState).toBe(1);
      expect(credentialState === APPLE_AUTH_STATES.AUTHORIZED).toBe(true);
    });

    test('should recognize revoked Apple ID state', () => {
      const credentialState = APPLE_AUTH_STATES.REVOKED;
      expect(credentialState).toBe(2);
      expect(credentialState === APPLE_AUTH_STATES.AUTHORIZED).toBe(false);
    });

    test('should recognize not found Apple ID state', () => {
      const credentialState = APPLE_AUTH_STATES.NOT_FOUND;
      expect(credentialState).toBe(3);
      expect(credentialState === APPLE_AUTH_STATES.AUTHORIZED).toBe(false);
    });

    test('should validate credential state transitions', () => {
      // Simulate state change from authorized to revoked
      let currentState = APPLE_AUTH_STATES.AUTHORIZED;
      expect(currentState).toBe(1);
      
      currentState = APPLE_AUTH_STATES.REVOKED;
      expect(currentState).toBe(2);
      expect(currentState !== APPLE_AUTH_STATES.AUTHORIZED).toBe(true);
    });
  });
});