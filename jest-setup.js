/**
 * Jest Setup File
 * Configures mocks and test environment for React Native
 */

// Define global variables
global.__DEV__ = true;
global.process = { ...process, env: { ...process.env, NODE_ENV: 'test' } };

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi'
  })),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi'
  }))
}));

// Mock react-native-localize
jest.mock('react-native-localize', () => ({
  getTimeZone: jest.fn(() => 'America/New_York'),
  getLocales: jest.fn(() => [{ languageCode: 'en', countryCode: 'US' }]),
  getNumberFormatSettings: jest.fn(() => ({})),
  getCalendar: jest.fn(() => 'gregorian'),
  getCountry: jest.fn(() => 'US'),
  getCurrencies: jest.fn(() => ['USD']),
  getTemperatureUnit: jest.fn(() => 'fahrenheit'),
  uses24HourClock: jest.fn(() => false),
  usesMetricSystem: jest.fn(() => false),
  usesAutoDateAndTime: jest.fn(() => true),
  usesAutoTimeZone: jest.fn(() => true),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// Mock Expo modules
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  isSpeakingAsync: jest.fn(() => Promise.resolve(false)),
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
}));

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(),
    }
  }
}));

// Mock @react-native-voice/voice
jest.mock('@react-native-voice/voice', () => ({
  default: {
    onSpeechStart: null,
    onSpeechRecognized: null,
    onSpeechEnd: null,
    onSpeechError: null,
    onSpeechResults: null,
    onSpeechPartialResults: null,
    onSpeechVolumeChanged: null,
    start: jest.fn(),
    stop: jest.fn(),
    cancel: jest.fn(),
    destroy: jest.fn(),
    removeAllListeners: jest.fn(),
    isAvailable: jest.fn(() => Promise.resolve(true)),
    isRecognitionAvailable: jest.fn(() => Promise.resolve(true)),
    getSupportedLocales: jest.fn(() => Promise.resolve(['en-US', 'ko-KR']))
  }
}));

// Mock global fetch
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
    status: 200,
    statusText: 'OK'
  })
);

// Environment variables for tests
process.env.EXPO_PUBLIC_API_BASE_URL = 'http://localhost:3000';
process.env.EXPO_PUBLIC_TRANSLATE_API_KEY = 'test-api-key';
process.env.EXPO_PUBLIC_LIBRETRANSLATE_URL = 'http://localhost:5000';

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

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Global test timeout
jest.setTimeout(10000);