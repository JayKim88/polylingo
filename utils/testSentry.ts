import * as Sentry from '@sentry/react-native';
import { captureError, captureMessage, addBreadcrumb } from './sentryUtils';

export const testSentryIntegration = () => {
  console.log('Testing Sentry integration...');
  
  // 1. 브레드크럼 추가
  addBreadcrumb('Sentry test started', 'test');
  
  // 2. 사용자 액션 추적
  import('./sentryUtils').then(({ trackUserAction }) => {
    trackUserAction('sentry_test_button_clicked', {
      test_type: 'manual',
      user_initiated: true,
    });
  });
  
  // 3. 메시지 전송
  captureMessage('Sentry integration test message', 'info');
  
  // 4. 가짜 IAP 에러 테스트
  import('./sentryUtils').then(({ captureIAPError }) => {
    captureIAPError(new Error('Test IAP validation failure'), {
      productId: 'test_pro_monthly',
      transactionId: 'test_transaction_123',
      step: 'validation_test'
    });
  });
  
  // 5. 가짜 네트워크 에러 테스트
  import('./sentryUtils').then(({ captureNetworkError }) => {
    captureNetworkError(new Error('Test API timeout'), {
      url: 'https://api.test.com/translate',
      method: 'POST',
      statusCode: 408,
      responseTime: 5000,
    });
  });
  
  // 6. 성능 이슈 테스트
  import('./sentryUtils').then(({ trackPerformance }) => {
    trackPerformance('test_slow_operation', 4000, {
      operation_type: 'test',
      complexity: 'high',
    });
  });
  
  // 7. 일반 테스트 에러 전송
  const testError = new Error('This is a test error from PolyLingo app');
  captureError(testError, {
    testType: 'integration_test',
    timestamp: new Date().toISOString(),
    platform: 'react-native',
    test_categories: ['error_handling', 'monitoring', 'debugging'],
  });
  
  console.log('Sentry test messages sent!');
};

// 개발 모드에서만 테스트 버튼을 위한 함수
export const throwTestError = () => {
  throw new Error('Manual test error thrown');
};