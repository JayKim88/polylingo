// Global test setup

// Define global variables
global.__DEV__ = true;
global.process = { ...process, env: { ...process.env, NODE_ENV: 'test' } };

// Mock react-native-iap
jest.mock('react-native-iap', () => ({
  initConnection: jest.fn(() => Promise.resolve()),
  endConnection: jest.fn(() => Promise.resolve()),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  getAvailablePurchases: jest.fn(() => Promise.resolve([])),
  getSubscriptions: jest.fn(() => Promise.resolve([])),
  requestPurchase: jest.fn(() => Promise.resolve({})),
  finishTransaction: jest.fn(() => Promise.resolve()),
  acknowledgePurchaseAndroid: jest.fn(() => Promise.resolve()),
}));

// Mock Apple Authentication
jest.mock('@invertase/react-native-apple-authentication', () => ({
  performRequest: jest.fn(() => Promise.resolve({ user: 'test-user', email: 'test@example.com' })),
  getCredentialStateForUser: jest.fn(() => Promise.resolve(1)), // AUTHORIZED
  State: { AUTHORIZED: 1, REVOKED: 2, NOT_FOUND: 3 },
  Operation: { LOGIN: 1, REFRESH: 2, LOGOUT: 3 },
  Scope: { EMAIL: 1, FULL_NAME: 2 },
  isSupported: true,
}));

// Mock react-native
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
  Alert: {
    alert: jest.fn(),
    prompt: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Sentry
jest.mock('./utils/sentryUtils', () => ({
  captureIAPError: jest.fn(),
  addBreadcrumb: jest.fn(),
  trackUserAction: jest.fn(),
}));

// Mock i18n
jest.mock('./i18n', () => ({
  t: jest.fn((key) => key),
  language: 'en',
}));

// Mock zustand stores
jest.mock('./stores/subscriptionStore', () => ({
  useSubscriptionStore: {
    getState: jest.fn(() => ({
      isCheckingSubscription: false,
      setIsCheckingSubscription: jest.fn(),
    })),
  },
}));

// Global test timeout
jest.setTimeout(10000);