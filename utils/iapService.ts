import {
  initConnection,
  endConnection,
  purchaseUpdatedListener,
  purchaseErrorListener,
  Purchase,
  PurchaseError,
  requestPurchase,
  getSubscriptions,
  validateReceiptIos,
  finishTransaction,
  getAvailablePurchases,
  acknowledgePurchaseAndroid,
  Subscription,
} from 'react-native-iap';
import { Platform, Alert } from 'react-native';
import { SubscriptionService } from './subscriptionService';
import { IAP_PRODUCT_IDS } from '../types/subscription';

export class IAPService {
  private static purchaseUpdateSubscription: any;
  private static purchaseErrorSubscription: any;
  private static isInitialized = false;
  private static isAvailable = false;

  // IAP 서비스 초기화
  static async initialize(): Promise<boolean> {
    try {
      // Check if already initialized
      if (this.isInitialized) {
        return true;
      }

      console.log('Initializing IAP service...');
      await initConnection();
      this.isInitialized = true;
      this.isAvailable = true;
      this.setupPurchaseListeners();
      console.log('IAP service initialized successfully');
      return true;
    } catch (error) {
      console.error('IAP initialization failed:', error);
      this.isInitialized = false;

      // Check if it's a known development environment issue
      const errMsg =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        (error as any).message === 'E_IAP_NOT_AVAILABLE';
      if (errMsg) {
        console.log(
          'IAP not available - likely running in simulator or development build'
        );
        console.log('Subscription features will be disabled');
        return false;
      }

      // Retry once after a short delay for other errors
      try {
        console.log('Retrying IAP initialization...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await initConnection();
        this.isInitialized = true;
        this.isAvailable = true;
        this.setupPurchaseListeners();
        console.log('IAP service initialized successfully on retry');
        return true;
      } catch (retryError) {
        console.error('IAP initialization retry failed:', retryError);
        const retryErrMsg =
          typeof retryError === 'object' &&
          retryError !== null &&
          'message' in retryError &&
          (retryError as any).message === 'E_IAP_NOT_AVAILABLE';
        if (retryErrMsg) {
          console.log(
            'IAP not available - subscription features will be disabled'
          );
        }
        return false;
      }
    }
  }

  // IAP 사용 가능 여부 확인
  static isIAPAvailable(): boolean {
    return this.isAvailable;
  }

  // 구매 리스너 설정
  private static setupPurchaseListeners() {
    // 구매 성공 리스너

    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('Purchase successful:', purchase);

        try {
          // 구매 검증
          const isValid = await this.validatePurchase(purchase);

          if (isValid) {
            // 구독 상태 업데이트
            await this.handleSuccessfulPurchase(purchase);

            // 트랜잭션 완료 처리
            await finishTransaction({
              purchase,
              isConsumable: false,
              developerPayloadAndroid: undefined,
            });

            Alert.alert('구매 완료', '구독이 성공적으로 활성화되었습니다!');
          } else {
            Alert.alert('구매 실패', '구매 검증에 실패했습니다.');
          }
        } catch (error) {
          console.error('Purchase validation error:', error);
          Alert.alert('구매 오류', '구매 처리 중 오류가 발생했습니다.');
        }
      }
    );

    // 구매 실패 리스너
    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: PurchaseError) => {
        console.error('Purchase error:', error);

        if (error.code !== 'E_USER_CANCELLED') {
          Alert.alert(
            '구매 실패',
            error.message || '구매 중 오류가 발생했습니다.'
          );
        }
      }
    );
  }

  // 구독 상품 목록 가져오기
  static async getSubscriptionProducts(): Promise<Subscription[]> {
    try {
      // Check if IAP is available
      if (!this.isAvailable) {
        console.log(
          'IAP not available - returning mock products for development'
        );
        return this.getMockProducts();
      }

      // Ensure IAP is initialized before getting products
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.error(
            'Failed to initialize IAP service - returning mock products'
          );
          return this.getMockProducts();
        }
      }

      const productIds = Object.values(IAP_PRODUCT_IDS);
      const products = await getSubscriptions({ skus: productIds });

      // If no products found (not registered in App Store Connect), return mock products for development
      if (products.length === 0 && __DEV__) {
        console.log(
          'No products found in App Store Connect - returning mock products for development'
        );
        return this.getMockProducts();
      }

      return products;
    } catch (error) {
      console.error('Failed to get subscription products:', error);

      // Return mock products in development mode for testing
      if (__DEV__) {
        console.log('Returning mock products for development testing');
        return this.getMockProducts();
      }

      return [];
    }
  }

  // 개발용 목 상품 목록
  private static getMockProducts(): Subscription[] {
    if (!__DEV__) return [];

    return [
      {
        productId: IAP_PRODUCT_IDS.PRO_MONTHLY,
        title: 'Pro Monthly Subscription',
        description: 'Pro features with monthly billing',
        price: '2.99',
        currency: 'USD',
        localizedPrice: '$2.99',
        countryCode: 'US',
      },
      {
        productId: IAP_PRODUCT_IDS.PRO_MAX_MONTHLY,
        title: 'Pro Max Monthly Subscription',
        description: 'Pro Max features with monthly billing',
        price: '4.99',
        currency: 'USD',
        localizedPrice: '$4.99',
        countryCode: 'US',
      },
      {
        productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY,
        title: 'Premium Yearly Subscription',
        description: 'Premium features with yearly billing',
        price: '29.99',
        currency: 'USD',
        localizedPrice: '$29.99',
        countryCode: 'US',
      },
    ] as Subscription[];
  }

  // 구독 구매 실행
  static async purchaseSubscription(productId: string): Promise<boolean> {
    try {
      // In development mode, simulate purchase for testing
      if (__DEV__ && !this.isAvailable) {
        console.log('Simulating purchase in development mode:', productId);
        Alert.alert(
          '개발 모드 구매 시뮬레이션',
          `${productId} 구독을 시뮬레이션합니다.\n\n실제 결제는 발생하지 않습니다.`,
          [
            { text: '취소', style: 'cancel', onPress: () => {} },
            {
              text: '시뮬레이션 실행',
              onPress: async () => {
                await this.simulatePurchase(productId);
              },
            },
          ]
        );
        return true;
      }

      // Check if IAP is available
      if (!this.isAvailable) {
        Alert.alert(
          'IAP Unavailable',
          'In-app purchases are not available in this environment'
        );
        return false;
      }

      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('IAP service not initialized');
        }
      }

      await requestPurchase({ sku: productId });
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);

      // In development mode, offer to simulate purchase
      if (__DEV__) {
        Alert.alert(
          '구매 실패',
          '실제 구매에 실패했습니다. 개발 모드에서 시뮬레이션하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            {
              text: '시뮬레이션',
              onPress: async () => {
                await this.simulatePurchase(productId);
              },
            },
          ]
        );
      }

      return false;
    }
  }

  // 개발용 구매 시뮬레이션
  private static async simulatePurchase(productId: string): Promise<void> {
    if (!__DEV__) return;

    console.log('Simulating purchase for:', productId);

    // Map productId to planId
    let planId: string;
    switch (productId) {
      case IAP_PRODUCT_IDS.PRO_MONTHLY:
        planId = 'pro_monthly';
        break;
      case IAP_PRODUCT_IDS.PRO_MAX_MONTHLY:
        planId = 'pro_max_monthly';
        break;
      case IAP_PRODUCT_IDS.PREMIUM_YEARLY:
        planId = 'premium_yearly';
        break;
      default:
        console.error('Unknown product ID for simulation:', productId);
        return;
    }

    // Set the subscription in local storage
    await SubscriptionService.setSubscription(planId, true);

    Alert.alert(
      '시뮬레이션 완료',
      `${planId} 구독이 활성화되었습니다.\n\n이는 개발 모드 시뮬레이션입니다.`
    );

    console.log(`Simulated subscription activated: ${planId}`);
  }

  // 구매 복원
  static async restorePurchases(): Promise<boolean> {
    try {
      // In development mode, simulate restore for testing
      if (__DEV__ && !this.isAvailable) {
        console.log('Simulating restore in development mode');
        Alert.alert(
          '개발 모드 복원 시뮬레이션',
          '구매 복원을 시뮬레이션합니다.\n\n현재 구독 상태를 확인해보세요.',
          [{ text: '확인', onPress: () => {} }]
        );
        return true;
      }

      // Check if IAP is available
      if (!this.isAvailable) {
        Alert.alert(
          'IAP Unavailable',
          'In-app purchases are not available in this environment'
        );
        return false;
      }

      const restored = await getAvailablePurchases();
      console.log('Restored purchases:', restored);

      if (restored.length === 0) {
        Alert.alert('복원 완료', '복원할 구매 항목이 없습니다.');
        return false;
      }

      // 복원된 구매 검증 및 처리
      for (const purchase of restored) {
        const isValid = await this.validatePurchase(purchase);
        if (isValid) {
          await this.handleSuccessfulPurchase(purchase);
        }
      }

      Alert.alert('복원 완료', '구매가 성공적으로 복원되었습니다!');
      return true;
    } catch (error) {
      console.error('Restore failed:', error);

      // In development mode, offer alternative
      if (__DEV__) {
        Alert.alert(
          '복원 실패',
          '실제 복원에 실패했습니다.\n\n개발 모드에서는 설정에서 구독을 직접 관리할 수 있습니다.',
          [{ text: '확인' }]
        );
      } else {
        Alert.alert('복원 실패', '구매 복원 중 오류가 발생했습니다.');
      }

      return false;
    }
  }

  // 구매 검증
  private static async validatePurchase(purchase: Purchase): Promise<boolean> {
    try {
      // Skip validation in development or if required credentials are missing
      if (__DEV__) {
        console.log('Development mode - skipping receipt validation');
        return true;
      }

      // Create a timeout promise to avoid hanging
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Validation timeout')), 10000);
      });

      const validationPromise = (async () => {
        if (Platform.OS === 'ios') {
          // Skip iOS validation if no shared secret is provided
          const sharedSecret = process.env.EXPO_PUBLIC_APPLE_SHARED_SECRET;
          if (!sharedSecret) {
            console.log('No Apple shared secret - skipping iOS validation');
            return true;
          }

          const result = await validateReceiptIos({
            receiptBody: {
              'receipt-data': purchase.transactionReceipt,
              password: sharedSecret,
            },
            isTest: true,
          });

          return result.status === 0;
        } else {
          // For Android, we would need proper Google Play Console setup
          // For now, just verify the purchase exists and has basic properties
          console.log(
            'Android validation not fully implemented - accepting purchase'
          );
          return !!(purchase.productId && purchase.purchaseToken);
        }
      })();

      return await Promise.race([validationPromise, timeoutPromise]);
    } catch (error) {
      console.error('Purchase validation error:', error);

      // In development or if validation service is unavailable,
      // we can be more lenient and just check if purchase exists
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      if (__DEV__ || errorMessage.includes('timeout')) {
        console.log('Validation failed but accepting purchase in development');
        return !!(purchase.productId && purchase.purchaseToken);
      }

      return false;
    }
  }

  // 성공적인 구매 처리
  private static async handleSuccessfulPurchase(purchase: Purchase) {
    try {
      const productId = purchase.productId;

      // 구독 플랜 ID 매핑
      let planId: string;
      switch (productId) {
        case IAP_PRODUCT_IDS.PRO_MONTHLY:
          planId = 'pro_monthly';
          break;
        case IAP_PRODUCT_IDS.PRO_MAX_MONTHLY:
          planId = 'pro_max_monthly';
          break;
        case IAP_PRODUCT_IDS.PREMIUM_YEARLY:
          planId = 'premium_yearly';
          break;
        default:
          throw new Error(`Unknown product ID: ${productId}`);
      }

      // 구독 상태 업데이트
      await SubscriptionService.setSubscription(planId, true);

      // Android에서 구매 승인
      if (Platform.OS === 'android' && purchase.purchaseToken) {
        await acknowledgePurchaseAndroid({
          token: purchase.purchaseToken,
          developerPayload: undefined,
        });
      }

      console.log(`Subscription activated: ${planId}`);
    } catch (error) {
      console.error('Failed to handle successful purchase:', error);
      throw error;
    }
  }

  // 현재 구독 상태 확인
  static async checkSubscriptionStatus(): Promise<void> {
    try {
      // If IAP is not available, set to free plan
      if (!this.isAvailable) {
        console.log('IAP not available - setting to free plan');
        await SubscriptionService.setSubscription('free', true);
        return;
      }

      // Ensure IAP is initialized before checking purchases
      if (!this.isInitialized) {
        console.log('IAP not initialized - setting to free plan');
        await SubscriptionService.setSubscription('free', true);
        return;
      }

      console.log('Checking subscription status...');

      let restored: Purchase[] = [];
      try {
        restored = await getAvailablePurchases();
        console.log('Available purchases retrieved:', restored.length);
      } catch (purchaseError) {
        console.warn('Failed to get available purchases:', purchaseError);
        // If we can't get purchases, default to free plan
        await SubscriptionService.setSubscription('free', true);
        return;
      }

      if (restored.length === 0) {
        // 구독이 없으면 Free 플랜으로 설정
        console.log('No purchases found - setting to free plan');
        await SubscriptionService.setSubscription('free', true);
        return;
      }

      // 가장 최근 구매 찾기
      const latestPurchase = restored.sort(
        (a: Purchase, b: Purchase) =>
          (b.transactionDate || 0) - (a.transactionDate || 0)
      )[0];

      console.log('Latest purchase found:', latestPurchase?.productId);

      // Skip validation in development/testing environments
      // and just check if the purchase exists
      if (__DEV__) {
        console.log('Development mode - skipping receipt validation');
        await this.handleSuccessfulPurchase(latestPurchase);
        return;
      }

      // Validate purchase in production
      try {
        const isValid = await this.validatePurchase(latestPurchase);
        if (isValid) {
          await this.handleSuccessfulPurchase(latestPurchase);
        } else {
          console.log('Purchase validation failed - setting to free plan');
          await SubscriptionService.setSubscription('free', true);
        }
      } catch (validationError) {
        console.warn('Purchase validation error:', validationError);
        // If validation fails, still activate the subscription in dev mode
        // but fall back to free in production
        if (__DEV__) {
          await this.handleSuccessfulPurchase(latestPurchase);
        } else {
          await SubscriptionService.setSubscription('free', true);
        }
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      await SubscriptionService.setSubscription('free', true);
    }
  }

  // IAP 서비스 종료
  static async cleanup(): Promise<void> {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      await endConnection();
      this.isInitialized = false;
    } catch (error) {
      console.error('IAP cleanup failed:', error);
    }
  }
}
