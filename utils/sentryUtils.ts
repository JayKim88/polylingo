import * as Sentry from '@sentry/react-native';

/**
 * Sentry에 에러를 수동으로 리포트하는 유틸리티 함수들
 */

export const captureError = async (
  error: Error,
  context?: Record<string, any>
) => {
  // 에러 발생 시마다 최신 구독 컨텍스트 업데이트
  await updateSubscriptionContext();

  Sentry.withScope((scope) => {
    if (context) {
      scope.setContext('additional_info', context);
    }
    Sentry.captureException(error);
  });
};

export const captureMessage = (
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
) => {
  Sentry.captureMessage(message, level);
};

export const setUserContext = (user: {
  id: string;
  email?: string;
  username?: string;
}) => {
  Sentry.setUser(user);
};

export const addBreadcrumb = (
  message: string,
  category?: string,
  data?: Record<string, any>
) => {
  Sentry.addBreadcrumb({
    message,
    category: category || 'app',
    level: 'info',
    data,
  });
};

// IAP 관련 에러 캐칭
export const captureIAPError = async (
  error: Error,
  context: {
    productId?: string;
    transactionId?: string;
    step: string;
  }
) => {
  // IAP 에러 발생 시 최신 구독 상태 업데이트
  await updateSubscriptionContext();

  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'iap');
    scope.setContext('iap_context', context);
    Sentry.captureException(error);
  });
};

// 번역 API 에러 캐칭
export const captureTranslationError = (
  error: Error,
  context: {
    sourceLanguage?: string;
    targetLanguages?: string[];
    textLength?: number;
    api_provider?: string;
  }
) => {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'translation');
    scope.setContext('translation_context', context);
    Sentry.captureException(error);
  });
};

// 앱 초기화 시 사용자 컨텍스트 설정
export const initializeUserContext = async () => {
  try {
    const { UserService } = await import('./userService');
    const { SubscriptionService } = await import('./subscriptionService');

    const [user, subscription] = await Promise.all([
      UserService.getCurrentUser(),
      SubscriptionService.getCurrentSubscription(),
    ]);

    if (user) {
      setUserContext({
        id: user.userId,
        email: user.email || undefined,
      });

      // 추가 컨텍스트 설정
      Sentry.setContext('user_details', {
        user_id: user.userId,
        apple_id: user.appleId ? 'connected' : 'not_connected',
        email: user.email || 'not_provided',
        last_sync: new Date(user.lastSync).toISOString(),
      });
    }

    if (subscription) {
      await updateSubscriptionContext(subscription);
    }
  } catch (error) {
    console.warn('Failed to initialize user context for Sentry:', error);
  }
};

// 구독 컨텍스트만 별도로 업데이트하는 함수
export const updateSubscriptionContext = async (subscription?: any) => {
  try {
    if (!subscription) {
      const { SubscriptionService } = await import('./subscriptionService');
      subscription = await SubscriptionService.getCurrentSubscription();
    }

    if (subscription) {
      // 실시간 사용량 정보 포함
      const currentUsage = await getCurrentDailyUsage();

      Sentry.setContext('subscription_details', {
        plan_id: subscription.planId,
        is_active: subscription.isActive,
        daily_usage: currentUsage.used,
        daily_limit: currentUsage.limit,
        daily_remaining: currentUsage.remaining,
        daily_usage_date:
          subscription.dailyUsage?.date ||
          new Date().toISOString().split('T')[0],
        original_transaction_id:
          subscription.originalTransactionIdentifierIOS || 'not_available',
        last_updated: new Date().toISOString(),
      });

      // 사용자 컨텍스트에도 구독 정보 추가
      Sentry.setUser((currentUser: any) => ({
        ...currentUser,
        subscription_plan: subscription.planId,
        is_premium: subscription.planId !== 'free',
        daily_usage: currentUsage.used,
      }));
    }
  } catch (error) {
    console.warn('Failed to update subscription context for Sentry:', error);
  }
};

// 현재 일일 사용량을 실시간으로 가져오는 함수
const getCurrentDailyUsage = async () => {
  try {
    const { SubscriptionService } = await import('./subscriptionService');
    return await SubscriptionService.getDailyUsage();
  } catch (error) {
    console.warn('Failed to get current daily usage:', error);
    return { used: 0, limit: 100, remaining: 100 };
  }
};

// 앱 상태 변경 시 컨텍스트 업데이트
export const updateAppStateContext = (state: string) => {
  Sentry.setContext('app_state', {
    current_state: state,
    timestamp: new Date().toISOString(),
  });

  addBreadcrumb(`App state changed to ${state}`, 'app_lifecycle');
};

// 네트워크 에러 캐칭
export const captureNetworkError = (
  error: Error,
  context: {
    url: string;
    method: string;
    statusCode?: number;
    requestBody?: any;
    responseTime?: number;
    api_provider?: string;
  }
) => {
  Sentry.withScope((scope) => {
    scope.setTag('error_type', 'network');
    scope.setLevel('warning');
    scope.setContext('network_context', {
      ...context,
      timestamp: new Date().toISOString(),
    });
    Sentry.captureException(error);
  });
};

// 성능 이슈 추적
export const trackPerformance = (
  action: string,
  duration: number,
  metadata?: Record<string, any>
) => {
  // 느린 작업 감지 (3초 이상)
  if (duration > 3000) {
    Sentry.withScope((scope) => {
      scope.setTag('performance_issue', 'slow_operation');
      scope.setLevel('warning');
      scope.setContext('performance', {
        action,
        duration_ms: duration,
        threshold_exceeded: true,
        ...metadata,
      });
      Sentry.captureMessage(
        `Slow operation detected: ${action} took ${duration}ms`,
        'warning'
      );
    });
  }

  addBreadcrumb(`${action} completed in ${duration}ms`, 'performance', {
    duration,
    ...metadata,
  });
};

// 사용자 행동 추적
export const trackUserAction = (
  action: string,
  metadata?: Record<string, any>
) => {
  addBreadcrumb(action, 'user_action', {
    timestamp: new Date().toISOString(),
    ...metadata,
  });
};
