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
import appleAuth from '@invertase/react-native-apple-authentication';

import { SubscriptionService } from './subscriptionService';
import { UserService } from './userService';
import { IAP_PRODUCT_IDS } from '../types/subscription';

type AppleAuthState = {
  isLoggedIn: boolean;
  currentUser: string | null;
};

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
  private static appleAuthState: AppleAuthState = {
    isLoggedIn: false,
    currentUser: null,
  };

  static async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      return true;
    }

    const result = await this.performInitialization();
    if (!result.success) {
      return await this.retryInitialization(result.error);
    }

    await this.restoreAppleUserSession();
    console.log('IAP service initialized successfully');
    return true;
  }

  private static async performInitialization(): Promise<InitializationResult> {
    try {
      console.log('Initializing IAP service...');
      await initConnection();
      this.isInitialized = true;
      this.isAvailable = true;
      this.setupPurchaseListeners();
      return { success: true };
    } catch (error) {
      console.error('IAP initialization failed:', error);
      this.isInitialized = false;
      
      const errorMessage = this.getErrorMessage(error);
      if (errorMessage === ERROR_CODES.IAP_NOT_AVAILABLE) {
        console.log('IAP not available - likely running in simulator or development build');
        return { success: false, error: errorMessage };
      }
      
      return { success: false, error: errorMessage };
    }
  }

  private static async retryInitialization(originalError?: string): Promise<boolean> {
    if (originalError === ERROR_CODES.IAP_NOT_AVAILABLE) {
      console.log('Subscription features will be disabled');
      return false;
    }

    try {
      console.log('Retrying IAP initialization...');
      await this.delay(CONSTANTS.RETRY_DELAY);
      await initConnection();
      this.isInitialized = true;
      this.isAvailable = true;
      this.setupPurchaseListeners();
      console.log('IAP service initialized successfully on retry');
      return true;
    } catch (retryError) {
      console.error('IAP initialization retry failed:', retryError);
      const errorMessage = this.getErrorMessage(retryError);
      if (errorMessage === ERROR_CODES.IAP_NOT_AVAILABLE) {
        console.log('IAP not available - subscription features will be disabled');
      }
      return false;
    }
  }

  private static getErrorMessage(error: unknown): string {
    return typeof error === 'object' && error !== null && 'message' in error
      ? (error as any).message
      : 'Unknown error';
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static isIAPAvailable(): boolean {
    return this.isAvailable;
  }

  static getAppleIDLoginState(): boolean {
    return this.appleAuthState.isLoggedIn;
  }

  static getCurrentAppleUser(): string | null {
    return this.appleAuthState.currentUser;
  }

  private static setAppleAuthState(isLoggedIn: boolean, currentUser?: string): void {
    this.appleAuthState = {
      isLoggedIn,
      currentUser: isLoggedIn ? (currentUser || this.appleAuthState.currentUser) : null,
    };
  }

  static async authenticateWithAppleID(): Promise<string | null> {
    if (!this.isAppleAuthSupported()) {
      return null;
    }

    try {
      const authResponse = await this.performAppleAuthentication();
      const credentialState = await appleAuth.getCredentialStateForUser(authResponse.user);

      if (credentialState === appleAuth.State.AUTHORIZED) {
        return await this.handleSuccessfulAppleAuth(authResponse.user);
      } else {
        console.log('Apple ID authentication failed - credential state:', credentialState);
        this.setAppleAuthState(false);
        return null;
      }
    } catch (error) {
      console.warn('Apple ID authentication error:', error);
      this.setAppleAuthState(false);
      return null;
    }
  }

  private static isAppleAuthSupported(): boolean {
    if (Platform.OS !== 'ios') {
      console.log('Apple Authentication is only available on iOS');
      return false;
    }

    if (!appleAuth.isSupported) {
      console.log('Apple Authentication is not supported on this device');
      return false;
    }

    return true;
  }

  private static async performAppleAuthentication() {
    return await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });
  }

  private static async handleSuccessfulAppleAuth(appleUserID: string): Promise<string> {
    console.log('Apple ID authentication successful:', appleUserID);
    this.setAppleAuthState(true, appleUserID);

    await Promise.all([
      UserService.authenticateWithAppleID(appleUserID),
      UserService.saveAppleUserID(appleUserID),
    ]);

    return appleUserID;
  }

  static async checkExistingAppleCredentials(): Promise<boolean> {
    if (!this.isAppleAuthSupported()) {
      return false;
    }

    try {
      const currentUser = this.appleAuthState.currentUser;
      if (!currentUser) {
        return false;
      }

      const credentialState = await appleAuth.getCredentialStateForUser(currentUser);
      const isAuthorized = credentialState === appleAuth.State.AUTHORIZED;
      
      this.setAppleAuthState(isAuthorized, currentUser);
      return isAuthorized;
    } catch (error) {
      console.error('Error checking Apple credentials:', error);
      this.setAppleAuthState(false);
      return false;
    }
  }

  private static async restoreAppleUserSession(): Promise<void> {
    try {
      const storedAppleUserID = await UserService.restoreAppleUserID();
      if (!storedAppleUserID) {
        return;
      }

      this.setAppleAuthState(false, storedAppleUserID);
      console.log('Restored Apple User ID:', storedAppleUserID);

      const isValid = await this.checkExistingAppleCredentials();
      if (isValid) {
        await UserService.authenticateWithAppleID(storedAppleUserID);
        console.log('Apple user session restored successfully');
      } else {
        console.log('Stored Apple credentials are no longer valid');
      }
    } catch (error) {
      console.error('Failed to restore Apple user session:', error);
    }
  }

  // TestFlight/Sandbox 환경 감지
  private static determineTestEnvironment(): boolean {
    // 1. 개발 모드는 무조건 Sandbox
    if (__DEV__) {
      console.log('Development mode detected - using Sandbox');
      return true;
    }

    // 2. 환경변수로 강제 설정 (TestFlight 배포용)
    if (process.env.EXPO_PUBLIC_IAP_USE_SANDBOX === 'true') {
      console.log('Forced sandbox mode via environment variable');
      return true;
    }

    // 3. Expo 환경 체크
    if (process.env.NODE_ENV !== 'production') {
      console.log('Non-production environment - using Sandbox');
      return true;
    }

    // 4. 기본값: Production (App Store)
    console.log('Production environment - using Production server');
    return false;
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
            await this.handleSuccessfulPurchase(purchase);

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
          console.error('Purchase validation error1:', error);
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
      { productId: IAP_PRODUCT_IDS.PRO_MONTHLY, title: 'Pro Monthly Subscription', price: '2.99' },
      { productId: IAP_PRODUCT_IDS.PRO_MAX_MONTHLY, title: 'Pro Max Monthly Subscription', price: '4.99' },
      { productId: IAP_PRODUCT_IDS.PREMIUM_YEARLY, title: 'Premium Yearly Subscription', price: '29.99' },
    ];

    return simulationProducts.map(product => ({
      ...product,
      description: `${product.title.split(' ')[0]} features with ${product.title.includes('Yearly') ? 'yearly' : 'monthly'} billing`,
      currency: 'USD',
      localizedPrice: `$${product.price}`,
      countryCode: 'US',
    })) as Subscription[];
  }

  // 구독 구매 실행
  static async purchaseSubscription(productId: string): Promise<boolean> {
    if (!this.ensureIAPAvailability()) {
      return false;
    }

    if (!this.isInitialized) {
      await this.ensureInitialized();
    }

    try {
      await requestPurchase({ sku: productId });
      return true;
    } catch (error) {
      console.error('Purchase failed:', error);
      return false;
    }
  }

  private static ensureIAPAvailability(): boolean {
    if (!this.isAvailable) {
      Alert.alert('IAP Unavailable', 'In-app purchases are not available in this environment');
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
    if (__DEV__ && !this.isAvailable) {
      return this.simulateRestoreInDevelopment();
    }

    if (!this.ensureIAPAvailability()) {
      return false;
    }

    try {
      const restored = await getAvailablePurchases();
      console.log('Restored purchases:', restored);

      if (restored.length === 0) {
        Alert.alert('복원 완료', '복원할 구매 항목이 없습니다.');
        return false;
      }

      await this.processRestoredPurchases(restored);
      Alert.alert('복원 완료', '구매가 성공적으로 복원되었습니다!');
      return true;
    } catch (error) {
      console.error('Restore failed:', error);
      this.handleRestoreError();
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

  private static async processRestoredPurchases(restored: Purchase[]): Promise<void> {
    for (const purchase of restored) {
      const isValid = await this.validatePurchase(purchase);
      if (isValid) {
        await this.handleSuccessfulPurchase(purchase);
      }
    }
  }

  private static handleRestoreError(): void {
    const message = __DEV__
      ? '실제 복원에 실패했습니다.\n\n개발 모드에서는 설정에서 구독을 직접 관리할 수 있습니다.'
      : '구매 복원 중 오류가 발생했습니다.';
    
    Alert.alert('복원 실패', message, [{ text: '확인' }]);
  }

  private static async validatePurchase(purchase: Purchase): Promise<boolean> {
    if (__DEV__) {
      console.log('Development mode - skipping receipt validation');
      return true;
    }

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
      setTimeout(() => reject(new Error('Validation timeout')), CONSTANTS.VALIDATION_TIMEOUT);
    });
  }

  private static async performPlatformValidation(purchase: Purchase): Promise<boolean> {
    if (Platform.OS === 'ios') {
      return await this.validateIOSPurchase(purchase);
    } else {
      return this.validateAndroidPurchase(purchase);
    }
  }

  private static async validateIOSPurchase(purchase: Purchase): Promise<boolean> {
    const sharedSecret = process.env.EXPO_PUBLIC_APPLE_SHARED_SECRET;
    const isTestEnvironment = this.determineTestEnvironment();

    const result = await validateReceiptIos({
      receiptBody: {
        'receipt-data': purchase.transactionReceipt,
        password: sharedSecret,
      },
      isTest: isTestEnvironment,
    });

    return result.status === 0;
  }

  private static validateAndroidPurchase(purchase: Purchase): boolean {
    console.log('Android validation not fully implemented - accepting purchase');
    return !!(purchase.productId && purchase.purchaseToken);
  }

  private static handleValidationError(error: unknown, purchase: Purchase): boolean {
    console.error('Purchase validation error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    if (__DEV__ || errorMessage.includes('timeout')) {
      console.log('Validation failed but accepting purchase in development');
      return !!(purchase.productId && purchase.purchaseToken);
    }

    return false;
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
      await SubscriptionService.setSubscription(planId, { isActive: true });

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

  /**
   * @description 현재 구독 상태 확인 (구독 모달에서만 호출) 후,
   * 구독 상태 업데이트 (Supabase 동기화 포함)
   */
  static async checkSubscriptionStatusAndUpdate(): Promise<void> {
    try {
      // If IAP is not available, set to free plan
      if (!this.isAvailable) {
        console.log('IAP not available - setting to free plan');
        this.setAppleAuthState(false);
        await SubscriptionService.setSubscription('free', { isActive: true, preserveUsage: true });
        return;
      }

      // Ensure IAP is initialized before checking purchases
      if (!this.isInitialized) {
        console.log('IAP not initialized - initializing now...');
        const initialized = await this.initialize();
        if (!initialized) {
          this.setAppleAuthState(false);
          await SubscriptionService.setSubscription('free', { isActive: true, preserveUsage: true });
          return;
        }
      }

      console.log('Checking subscription status...');

      let restored: Purchase[] = [];
      try {
        // 먼저 Apple ID 인증 확인/수행
        let isAuthenticated = await this.checkExistingAppleCredentials();

        if (!isAuthenticated) {
          const appleUserID = await this.authenticateWithAppleID();
          if (!appleUserID) {
            throw new Error('Apple ID authentication required');
          }
          isAuthenticated = true;
        }

        // Apple ID 인증 후 구매 복원
        restored = await getAvailablePurchases();
        this.setAppleAuthState(true, this.getCurrentAppleUser() || undefined);
        console.log('User authenticated with Apple ID:', this.getCurrentAppleUser());
      } catch (purchaseError) {
        console.warn('Failed to get available purchases:', purchaseError);
        // Failed to access purchases likely means not logged in to Apple ID
        this.setAppleAuthState(false);
        await SubscriptionService.setSubscription('free', { isActive: true, preserveUsage: true });
        return;
      }

      // 가장 최근 구매 찾기
      const latestPurchase = restored.sort(
        (a: Purchase, b: Purchase) =>
          (b.transactionDate || 0) - (a.transactionDate || 0)
      )[0];

      // Validate purchase in production
      try {
        const isValid = await this.validatePurchase(latestPurchase);
        if (isValid) {
          await this.handleSuccessfulPurchase(latestPurchase);
        } else {
          console.log('Purchase validation failed - setting to free plan');
          await SubscriptionService.setSubscription('free', { isActive: true, preserveUsage: true });
        }
      } catch (validationError) {
        console.warn('Purchase validation error3:', validationError);
        // If validation fails, still activate the subscription in dev mode
        // but fall back to free in production
        await SubscriptionService.setSubscription('free', { isActive: true, preserveUsage: true });
      }
    } catch (error) {
      console.error('Failed to check subscription status:', error);
      await SubscriptionService.setSubscription('free', { isActive: true, preserveUsage: true });
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
