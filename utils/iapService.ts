import {
  initConnection,
  endConnection,
  Purchase,
  requestPurchase,
  getSubscriptions,
  finishTransaction,
  getAvailablePurchases,
  Subscription,
  ProductPurchase,
} from 'react-native-iap';
import { Platform, Alert } from 'react-native';
import i18n from '../i18n';

import { SubscriptionService } from './subscriptionService';
import { UserService } from './userService';
import { IAP_PRODUCT_IDS } from '../types/subscription';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { captureIAPError, addBreadcrumb } from './sentryUtils';

type InitializationResult = {
  success: boolean;
  error?: string;
};

const CONSTANTS = {
  VALIDATION_TIMEOUT: 10000,
  RETRY_DELAY: 1000,
  YEAR_IN_MS: 365 * 24 * 60 * 60 * 1000,
  MONTH_IN_MS: 30 * 24 * 60 * 60 * 1000,
} as const;

const ERROR_CODES = {
  IAP_NOT_AVAILABLE: 'E_IAP_NOT_AVAILABLE',
  USER_CANCELLED: 'E_USER_CANCELLED',
} as const;

export class IAPService {
  private static purchaseUpdateSubscription: any;
  private static purchaseErrorSubscription: any;
  private static isInitialized = false;
  private static isAvailable = false;
  private static processedPurchases = new Set<string>(); // 처리된 구매 추적
  private static isProcessingRestore = false; // 복원 처리 중 플래그
  private static initializationPromise: Promise<boolean> | null = null; // 초기화 중복 방지
  // Apple auth state removed - using transaction-based identification
  private static lastSubscriptionCheck = 0; // 마지막 구독 체크 시간
  private static SUBSCRIPTION_CHECK_INTERVAL = 2 * 60 * 1000; // 2분

  static async initialize(): Promise<boolean> {
    if (this.initializationPromise) {
      return await this.initializationPromise;
    }

    if (this.isInitialized) {
      return true;
    }

    this.initializationPromise = this.performInitializationSequence();
    return await this.initializationPromise;
  }

  private static async performInitializationSequence(): Promise<boolean> {
    try {
      await this.performInitialization();
      // Skip Apple authentication - use transaction-based identification instead
      return true;
    } catch (error) {
      this.initializationPromise = null;
      throw error;
    } finally {
      this.initializationPromise = null;
    }
  }

  private static async performInitialization(): Promise<InitializationResult> {
    try {
      console.log('Initializing IAP service...');

      // 기존 연결이 있으면 먼저 정리
      if (this.isInitialized) {
        await this.cleanup();
      }

      await initConnection();
      this.isInitialized = true;
      this.isAvailable = true;
      return { success: true };
    } catch (error) {
      console.error('IAP initialization failed:', error);
      this.isInitialized = false;
      this.isAvailable = false;

      const errorMessage = this.getErrorMessage(error);
      if (errorMessage === ERROR_CODES.IAP_NOT_AVAILABLE) {
        console.log(
          'IAP not available - likely running in simulator or development build'
        );
        return { success: false, error: errorMessage };
      }

      return { success: false, error: errorMessage };
    }
  }

  private static getErrorMessage(error: unknown): string {
    return typeof error === 'object' && error !== null && 'message' in error
      ? (error as any).message
      : 'Unknown error';
  }

  static isIAPAvailable(): boolean {
    return this.isAvailable;
  }

  // Apple authentication methods removed - using transaction-based identification

  // Apple authentication methods removed - using transaction-based identification only

  // TestFlight/Sandbox 환경 감지
  private static determineTestEnvironment(): boolean {
    // 1. 개발 모드는 무조건 Sandbox
    if (__DEV__) {
      console.log('✅ Using Sandbox: Development mode');
      return true;
    }

    // 2. 환경변수로 강제 설정 (TestFlight 배포용)
    if (process.env.EXPO_PUBLIC_IAP_USE_SANDBOX === 'true') {
      console.log('✅ Using Sandbox: Environment variable forced');
      return true;
    }

    // 3. 기본값: Production (App Store)
    console.log('🏪 Using Production: App Store environment');
    return false;
  }

  // 구독 상품 목록 가져오기
  static async getSubscriptionProducts(): Promise<Subscription[]> {
    try {
      // Check if IAP is available
      if (!this.isAvailable) {
        console.log(
          'IAP not available - returning simulation products for development'
        );
        return this.getSimulationProducts();
      }

      // Ensure IAP is initialized before getting products
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          console.error(
            'Failed to initialize IAP service - returning simulation products'
          );
          return this.getSimulationProducts();
        }
      }

      const productIds = Object.values(IAP_PRODUCT_IDS);
      const products = await getSubscriptions({ skus: productIds });

      if (products.length === 0 && __DEV__) {
        console.log(
          'No products found in App Store Connect - returning simulation products for development'
        );
        return this.getSimulationProducts();
      }

      return products;
    } catch (error) {
      console.error('Failed to get subscription products:', error);

      if (__DEV__) {
        console.log('Returning simulation products for development testing');
        return this.getSimulationProducts();
      }

      return [];
    }
  }

  // 개발용 시뮬레이션 상품 목록 (App Store Connect 미등록 시 사용)
  private static getSimulationProducts(): Subscription[] {
    if (!__DEV__) return [];

    const simulationProducts = [
      {
        productId: IAP_PRODUCT_IDS.PRO_MONTHLY,
        title: 'Pro Monthly Subscription',
        price: '2.99',
      },
      {
        productId: IAP_PRODUCT_IDS.PRO_MAX_MONTHLY,
        title: 'Pro Max Monthly Subscription',
        price: '4.99',
      },
      {
        productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY,
        title: 'Premium Yearly Subscription',
        price: '29.99',
      },
    ];

    return simulationProducts.map((product) => ({
      ...product,
      description: `${product.title.split(' ')[0]} features with ${
        product.title.includes('Yearly') ? 'yearly' : 'monthly'
      } billing`,
      currency: 'USD',
      localizedPrice: `$${product.price}`,
      countryCode: 'US',
    })) as Subscription[];
  }

  // 구독 구매 실행
  static async purchaseSubscription(
    productId: string
  ): Promise<ProductPurchase | ProductPurchase[] | null> {
    if (!this.ensureIAPAvailability()) {
      return null;
    }

    if (!this.isInitialized) {
      await this.ensureInitialized();
    }

    addBreadcrumb(`Starting purchase for ${productId}`, 'iap');

    try {
      const result = await requestPurchase({ sku: productId });

      if (result) {
        const purchases = Array.isArray(result) ? result : [result];
        const purchase = purchases[0] as Purchase;

        const purchaseId = __DEV__
          ? purchase.productId
          : `${purchase.productId}_${purchase.originalTransactionIdentifierIOS}`;

        if (this.processedPurchases.has(purchaseId)) {
          console.log(`Purchase already processed: ${purchaseId}`);
          return result;
        }

        this.processedPurchases.add(purchaseId);

        try {
          const isValid = await this.validatePurchase(purchase);

          if (isValid) {
            await this.handleSuccessfulPurchase(purchase);

            await finishTransaction({
              purchase: purchase,
              isConsumable: false,
              developerPayloadAndroid: undefined,
            });

            console.log('Purchase completed successfully');
          } else {
            console.error('Purchase validation failed');
            this.processedPurchases.delete(purchaseId);
            return null;
          }
        } catch (processingError) {
          console.error('Purchase processing failed:', processingError);

          this.processedPurchases.delete(purchaseId);

          await finishTransaction({
            purchase: purchase,
            isConsumable: false,
            developerPayloadAndroid: undefined,
          });

          throw processingError;
        }
      }

      return result || null;
    } catch (error: any) {
      console.error('Purchase failed:', error);

      // Sentry에 구매 실패 에러 전송
      captureIAPError(error, {
        productId,
        step: 'purchase_request',
      });

      // 사용자가 취소한 경우 에러를 다시 throw하여 상위에서 처리할 수 있도록 함
      if (
        error?.code === 'E_USER_CANCELLED' ||
        error?.message?.includes('cancel') ||
        error?.message?.includes('Cancel') ||
        error?.userCancelled === true
      ) {
        throw error; // 취소 에러를 상위로 전달
      }

      return null;
    }
  }

  private static ensureIAPAvailability(): boolean {
    if (!this.isAvailable) {
      Alert.alert(
        'IAP Unavailable',
        'In-app purchases are not available in this environment'
      );
      return false;
    }
    return true;
  }

  private static async ensureInitialized(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    const initialized = await this.initialize();
    if (!initialized) {
      throw new Error('IAP service not initialized');
    }
    return true;
  }

  // 구매 복원
  static async restorePurchases(): Promise<boolean> {
    console.log('Starting restore purchases...');

    if (__DEV__ && !this.isAvailable) {
      return this.simulateRestoreInDevelopment();
    }

    if (!this.ensureIAPAvailability()) {
      return false;
    }

    try {
      console.log('⏳ Fetching available purchases from Apple...');

      // getAvailablePurchases에 타임아웃 적용 (30초)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(new Error('Restore timeout - Apple server took too long')),
          30000
        );
      });

      const restorePromise = getAvailablePurchases({
        onlyIncludeActiveItems: true,
      });
      const activePurchases = await Promise.race([
        restorePromise,
        timeoutPromise,
      ]);

      if (activePurchases.length === 0) {
        Alert.alert(
          i18n.t('subscription.restoreComplete'),
          i18n.t('subscription.noItemsToRestore')
        );
        return false;
      }

      return this.processRestoredPurchases(activePurchases);
    } catch (error) {
      console.error('Restore failed:', error);

      if (error instanceof Error && error.message?.includes('timeout')) {
        Alert.alert(
          i18n.t('subscription.restoreTimeout'),
          i18n.t('subscription.restoreTimeoutMessage')
        );
      } else {
        this.handleRestoreError();
      }
      return false;
    }
  }

  private static simulateRestoreInDevelopment(): boolean {
    console.log('Simulating restore in development mode');
    Alert.alert(
      '개발 모드 복원 시뮬레이션',
      '구매 복원을 시뮬레이션합니다.\n\n현재 구독 상태를 확인해보세요.',
      [{ text: '확인', onPress: () => {} }]
    );
    return true;
  }

  private static async processRestoredPurchases(
    restored: Purchase[]
  ): Promise<boolean> {
    this.isProcessingRestore = true;

    try {
      const latestPurchase = IAPService.getLatestPurchase(restored);

      if (latestPurchase) {
        const isValid = await this.validatePurchase(latestPurchase);

        if (isValid) {
          await this.handleSuccessfulPurchaseQuietly(latestPurchase);
          return true;
        } else {
          Alert.alert(
            i18n.t('subscription.subscriptionStatus'),
            i18n.t('subscription.noActiveSubscription'),
            [{ text: i18n.t('alert.confirm') }]
          );
          console.log('Latest purchase validation failed');
          return false;
        }
      }

      // 모든 복원된 구매를 처리됨으로 표시 (리스너 재트리거 방지)
      for (const purchase of restored) {
        const purchaseId = __DEV__
          ? purchase.productId
          : `${purchase.productId}_${purchase.originalTransactionIdentifierIOS}`;
        this.processedPurchases.add(purchaseId);
        console.log(`Marked as processed: ${purchaseId} (DEV: ${__DEV__})`);
      }
      return false;
    } catch {
      Alert.alert(
        i18n.t('subscription.restoreError'),
        i18n.t('subscription.restoreErrorMessage')
      );
      return false;
    } finally {
      this.isProcessingRestore = false;
    }
  }

  private static handleRestoreError(): void {
    const message = __DEV__
      ? '실제 복원에 실패했습니다.\n\n개발 모드에서는 설정에서 구독을 직접 관리할 수 있습니다.'
      : i18n.t('subscription.restoreErrorMessage');

    Alert.alert(i18n.t('subscription.restoreError'), message, [
      { text: i18n.t('alert.confirm') },
    ]);
  }

  public static async validatePurchase(purchase: Purchase): Promise<boolean> {
    try {
      const timeoutPromise = this.createTimeoutPromise();
      const validationPromise = this.performPlatformValidation(purchase);

      return await Promise.race([validationPromise, timeoutPromise]);
    } catch (error) {
      return this.handleValidationError(error, purchase);
    }
  }

  private static createTimeoutPromise(): Promise<boolean> {
    return new Promise<boolean>((_, reject) => {
      setTimeout(
        () => reject(new Error('Validation timeout')),
        CONSTANTS.VALIDATION_TIMEOUT
      );
    });
  }

  private static async performPlatformValidation(
    purchase: Purchase
  ): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return await this.validateIOSPurchase(purchase);
    } else {
      return this.validateAndroidPurchase(purchase);
    }
  }

  private static async validateIOSPurchase(
    purchase: Purchase
  ): Promise<boolean> {
    try {
      // Use server-side validation API
      const baseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
      const apiUrl = baseUrl ? `${baseUrl}/api/iap/verify` : '/api/iap/verify';

      const isTestEnvironment = this.determineTestEnvironment();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.EXPO_PUBLIC_IAP_API_KEY || '',
        },
        body: JSON.stringify({
          receiptData: purchase.transactionReceipt,
          isTest: isTestEnvironment,
          platform: 'ios',
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      const result = await response.json();

      if (!result.isValid) {
        console.log('❌ Apple validation failed on server');
        return false;
      }

      // expiresDate가 있는 경우 현재 시간과 비교하여 만료 여부 확인
      if (result.expiresDate) {
        const expiresTime = new Date(result.expiresDate).getTime();
        const now = Date.now();
        const isActive = now < expiresTime;

        return isActive;
      }

      return result.isValid;
    } catch (error) {
      console.error('Server validation failed:', error);
      if (__DEV__) {
        return !!(purchase.productId && purchase.transactionReceipt);
      }
      return false;
    }
  }

  private static validateAndroidPurchase(purchase: Purchase): boolean {
    console.log(
      'Android validation not fully implemented - accepting purchase'
    );
    return !!(purchase.productId && purchase.originalTransactionIdentifierIOS);
  }

  private static handleValidationError(
    error: unknown,
    purchase: Purchase
  ): boolean {
    console.error('Purchase validation error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (__DEV__ || errorMessage.includes('timeout')) {
      console.log('Validation failed but accepting purchase in development');
      return !!(
        purchase.productId && purchase.originalTransactionIdentifierIOS
      );
    }

    return false;
  }

  // 성공적인 구매 처리 - 트랜잭션 ID를 사용자 식별자로 사용
  private static async handleSuccessfulPurchase(purchase: Purchase) {
    try {
      const productId = purchase.productId;
      const transactionId = purchase.originalTransactionIdentifierIOS;

      if (!transactionId) {
        throw new Error('Missing transaction identifier for purchase');
      }

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

      // Transaction ID 저장
      await UserService.saveTransactionId(transactionId);

      // 새 구매 시 사용량 초기화하여 구독 상태 업데이트 (트랜잭션 ID 기반)
      console.log(
        `🔄 Activating subscription for transaction: ${transactionId}`
      );
      try {
        await SubscriptionService.setSubscription(
          planId,
          {
            isActive: true,
            preserveUsage: false,
          },
          transactionId
        );
      } catch (syncError) {
        console.error(
          'Failed to sync subscription to server - setting to free:',
          syncError
        );
        // 서버 동기화 실패 시 free로 설정 (이미 syncToServer에서 처리됨)
        Alert.alert(
          i18n.t('alert.error'),
          'Server synchronization failed. Your subscription has been reset to free plan.',
          [{ text: i18n.t('alert.confirm') }]
        );
        return; // 에러 시 더 이상 진행하지 않음
      }

      console.log(
        `Subscription activated: ${planId} for transaction: ${transactionId}`
      );
    } catch (error) {
      console.error('Failed to handle successful purchase:', error);
      throw error;
    }
  }

  // 복원 시 조용히 처리 (리스너 트리거 방지) - 트랜잭션 ID를 사용자 식별자로 사용
  private static async handleSuccessfulPurchaseQuietly(purchase: Purchase) {
    try {
      const productId = purchase.productId;
      const transactionId = purchase.originalTransactionIdentifierIOS;

      if (!transactionId) {
        throw new Error('Missing transaction identifier for restore');
      }

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

      // Transaction ID 저장
      await UserService.saveTransactionId(transactionId);

      // 구독 상태 업데이트 (조용히) - 트랜잭션 ID 기반
      try {
        await SubscriptionService.setSubscription(
          planId,
          {
            isActive: true,
            preserveUsage: true,
          },
          transactionId
        );
      } catch (syncError) {
        console.error(
          'Failed to sync subscription to server during restore - setting to free:',
          syncError
        );
        // 서버 동기화 실패 시 에러를 throw하여 상위에서 처리
        throw syncError;
      }

      console.log(
        `Subscription restored quietly: ${planId} for transaction: ${transactionId}`
      );
    } catch (error) {
      console.error('Failed to handle successful purchase quietly:', error);
      throw error;
    }
  }

  public static getLatestPurchase = (purchases: Purchase[]) => {
    return purchases.sort((a: Purchase, b: Purchase) => {
      const dateA = a.transactionDate || 0;
      const dateB = b.transactionDate || 0;
      return dateB - dateA;
    })[0];
  };

  static async setSubscriptionFreeWithPreserve() {
    await SubscriptionService.setSubscription('free', {
      isActive: true,
      preserveUsage: true,
    });
  }

  /**
   * @description 현재 구독 상태 확인 (구독 모달에서만 호출) 후,
   * 구독 상태 업데이트 (Supabase 동기화 포함)
   */
  static async checkSubscriptionStatusAndUpdate(
    checkFromActive?: boolean
  ): Promise<void> {
    if (checkFromActive) {
      const now = Date.now();
      const isRecentlyChecked =
        now - this.lastSubscriptionCheck < this.SUBSCRIPTION_CHECK_INTERVAL;

      if (isRecentlyChecked) return;

      this.lastSubscriptionCheck = now;
    }

    // 이미 체크 중이면 중복 실행 방지
    const store = useSubscriptionStore.getState();
    if (store.isCheckingSubscription) {
      console.log('Subscription check already in progress - skipping');
      return;
    }
    store.setIsCheckingSubscription(true);

    try {
      // If IAP is not available, set to free plan
      if (!this.isAvailable) {
        console.log('IAP not available - setting to free plan');
        await this.setSubscriptionFreeWithPreserve();
        return;
      }

      // Ensure IAP is initialized before checking purchases
      if (!this.isInitialized) {
        console.log('IAP not initialized - initializing now...');
        const initialized = await this.initialize();
        if (!initialized) {
          await this.setSubscriptionFreeWithPreserve();
          return;
        }
      }

      console.log('Checking subscription status...');

      let activePurchases: Purchase[] = [];
      let detectedSubscriptionPlan = 'free';
      let originalTransactionId: string | undefined;

      try {
        // 구매 복원 (Apple ID 인증 없이)
        activePurchases = await getAvailablePurchases({
          onlyIncludeActiveItems: true,
        });

        console.log(
          `Found ${activePurchases.length} total purchases from Apple`
        );
      } catch (purchaseError) {
        console.warn('Failed to get available purchases:', purchaseError);
        // Failed to access purchases - set to free plan
        await this.setSubscriptionFreeWithPreserve();
        return;
      }

      if (activePurchases.length === 0) {
        console.log(
          'No purchases found - user may have cancelled subscription'
        );
        detectedSubscriptionPlan = 'free';
      } else {
        const latestPurchase = this.getLatestPurchase(activePurchases);

        originalTransactionId = latestPurchase.originalTransactionIdentifierIOS;

        // 서버를 통해 실제 구독 상태 검증 (만료/취소 여부 확인)
        try {
          const isValid = await this.validatePurchase(latestPurchase);

          if (isValid) {
            await this.handleSuccessfulPurchaseQuietly(latestPurchase);

            /**
             * @description cannot return free
             */
            switch (latestPurchase.productId) {
              case IAP_PRODUCT_IDS.PRO_MONTHLY:
                detectedSubscriptionPlan = 'pro_monthly';
                break;
              case IAP_PRODUCT_IDS.PRO_MAX_MONTHLY:
                detectedSubscriptionPlan = 'pro_max_monthly';
                break;
              case IAP_PRODUCT_IDS.PREMIUM_YEARLY:
                detectedSubscriptionPlan = 'premium_yearly';
                break;
              default:
                detectedSubscriptionPlan = 'free';
            }
            console.log(
              `✅ Setting active subscription to: ${detectedSubscriptionPlan}`
            );
          } else {
            console.log(
              `❌ Server validation failed for ${latestPurchase.productId} - subscription is expired or cancelled`
            );
            detectedSubscriptionPlan = 'free';
          }
        } catch (validationError) {
          console.warn(
            `❌ Server validation error for ${latestPurchase.productId}:`,
            validationError
          );
          console.log('Defaulting to free plan due to validation error');
          detectedSubscriptionPlan = 'free';
        }
      }

      // 서버의 기존 구독과 감지된 상태 비교 (앱 재설치 시 로컬 데이터가 없을 수 있음)
      const serverSub = await UserService.getLatestSubscriptionFromServer(
        originalTransactionId
      );
      const isNewSubscription = serverSub?.plan_id !== detectedSubscriptionPlan;

      const isPaidNewPlan =
        detectedSubscriptionPlan !== 'free' && isNewSubscription;

      if (isPaidNewPlan) {
        console.log(
          `📈 Subscription change detected: ${serverSub?.plan_id} → ${detectedSubscriptionPlan}`
        );

        // 새로운 구독이나 플랜 변경 시 사용량 초기화
        try {
          await SubscriptionService.setSubscription(
            detectedSubscriptionPlan,
            {
              isActive: true,
              preserveUsage: false, // 사용량 초기화
            },
            originalTransactionId
          );
        } catch (syncError) {
          console.error(
            'Failed to sync new subscription to server - setting to free:',
            syncError
          );
          detectedSubscriptionPlan = 'free';
          await this.setSubscriptionFreeWithPreserve();
        }
      } else {
        console.log(`✅ Same subscription plan: ${detectedSubscriptionPlan}`);
        // 동일한 플랜이면 사용량 보존
        try {
          await SubscriptionService.setSubscription(
            detectedSubscriptionPlan,
            {
              isActive: true,
              preserveUsage: true,
            },
            originalTransactionId
          );
        } catch (syncError) {
          console.error(
            'Failed to sync existing subscription to server - setting to free:',
            syncError
          );
          await this.setSubscriptionFreeWithPreserve();
        }
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      await this.setSubscriptionFreeWithPreserve();
    } finally {
      useSubscriptionStore.getState().setIsCheckingSubscription(false);
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
