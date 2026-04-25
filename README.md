<div style="display: flex; gap: 16px; overflow-x: auto;">  
  <img src="https://github.com/user-attachments/assets/6f433dc2-e6fb-420e-a9b8-5211640e325b"
       style="width: 240px; height: auto;" />
  <img src="https://github.com/user-attachments/assets/03a6d96b-5c30-47fc-b286-4751101abcc5"
       style="width: 240px; height: auto;" />
  <img src="https://github.com/user-attachments/assets/65635f39-dfb1-40fb-8c8b-52f7c0f52d77"
       style="width: 240px; height: auto;" />  
</div>

# PolyLingo

A real-time multi-language translation mobile application built with React Native and Expo.

Using Google Translate API as the primary translation engine with MyMemory as fallback, the app provides accurate translations with pronunciation guides for non-Latin scripts.

Supporting 14 languages with parallel translation to up to 13 target languages simultaneously, the app includes advanced features like speech recognition, offline caching, and real-time state synchronization.

Built with full iOS ecosystem integration and native platform features.

<br/>

## 🛠 Tech Stack & Architecture

**Frontend**

- **React Native** with Expo 53 for cross-platform mobile development
- **TypeScript** with strict mode for type safety and enhanced developer experience
- **Expo Router** for file-based navigation and deep linking
- **Zustand** for lightweight, performant state management
- **NativeWind** for utility-first styling with responsive design
- **React Native Reanimated** for smooth animations and gestures

**Backend & Infrastructure**

- **Google Translate API** for primary translation with phonetic transliteration
- **MyMemory API** as fallback translation provider
- **Wiktionary REST API** for English word definitions and part-of-speech lookup
- **Dictionary API** (`dictionaryapi.dev`) for English IPA pronunciation
- **Supabase PostgreSQL** for user data management
- **Sentry** for real-time error tracking and performance monitoring

**Platform Integrations**

- **Apple Authentication** for secure user sign-in
- **React Native Voice** for speech recognition and voice input
- **Expo Speech** for text-to-speech pronunciation

**Development & Testing**

- **Jest** with comprehensive unit, integration, and e2e tests
- **React Native Testing Library** for component testing
- **ESLint** with Expo configuration for code quality
- **TypeScript** strict configuration for runtime safety
- **Prettier** with Tailwind plugin for consistent formatting

<br/>

## 🚀 Core Features

**Core Translation Features**

- **Multi-Language Parallel Translation**: Support for 14 languages with simultaneous translation to up to 13 target languages
- **Parallel Processing Optimization**: Asynchronous translation per language to minimize user wait time
- **Smart Caching System**: 24-hour memory caching with offline access support
- **Translation Error Recovery**: Auto-retry logic, API fallback, and individual language state management

**Audio & Voice Features**

- **Speech Recognition & TTS**: Real-time voice input with phonetic transcription
- **Pronunciation Guides**: Google Translate transliteration for non-Latin scripts, IPA via Dictionary API for English
- **Multi-Language Voice Support**: Speech recognition across all 14 supported languages

**Advanced User Experience**

- **Favorites & History Management**: Date-based translation records with intelligent search
- **User Customization**: Drag-and-drop language priority settings
- **Dark/Light Theme Support**: User preference-based theme switching with system integration

<br/>

## 🏗 Architecture & Data Management

### Hybrid Data Architecture

**Local-First with Cloud Sync**

- **AsyncStorage Primary**: Offline-first experience with Supabase synchronization
- **Multi-Layer Caching**: Translation results (24h memory) and user session state
- **Race Condition Prevention**: Concurrent request deduplication via shared Promise reference

</br>

## 💡 Code Quality & Architecture Highlights

### 1. TypeScript Implementation - Precise Type Safety

#### Comprehensive Domain Models (`types/dictionary.ts`)

```typescript
export interface TranslationMeaning {
  translation: string;
  type: string;
  pronunciation?: string;
}

export interface TranslationResult {
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  meanings?: TranslationMeaning[];
  pronunciation?: string;
  confidence: number;
  timestamp: number;
}

export interface FavoriteItem {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  meanings?: TranslationMeaning[];
  createdAt: number;
}

export interface HistoryItem {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  sourceText: string;
  translatedText: string;
  searchedAt: number;
  searchedData: {
    lng: string;
    text: string;
  }[];
}
```

### 2. Performance Optimization

#### Smart Translation Caching (`utils/translationAPI.ts`)

```typescript
// Save to cache (only when online)
private static async saveToCache(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  translation: string,
  meanings?: TranslationMeaning[],
  pronunciation?: string
): Promise<void> {
  // Check network connectivity before caching
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) return;

  const key = this.getCacheKey(text, sourceLanguage, targetLanguage);
  this.translationCache.set(key, {
    translation,
    meanings,
    pronunciation,
    timestamp: Date.now(),
  });
}

static async translate(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
    _options?: Record<string, unknown>
  ): Promise<{
    translation: string;
    meanings?: TranslationMeaning[];
    pronunciation?: string;
  }> {
    if (!text.trim()) return { translation: '' };
    if (sourceLanguage === targetLanguage) return { translation: text };

    const cached = this.getFromCache(text, sourceLanguage, targetLanguage);
    if (cached) {
      // Check if cached translation is URL-encoded and fix it
      let translation = cached.translation;
      if (translation.includes('%')) {
        try {
          const decoded = decodeURIComponent(translation);

          // Update cache with fixed version
          await this.saveToCache(
            text,
            sourceLanguage,
            targetLanguage,
            decoded,
            cached.meanings,
            cached.pronunciation
          );
...
```

#### Concurrent Request Deduplication (`utils/subscriptionService.ts`)

```typescript
export class SubscriptionService {
  private static isUpdating = false;
  private static subscriptionPromise: Promise<UserSubscription | null> | null =
    null;

  static async getCurrentSubscription(
    isSearching?: boolean
  ): Promise<UserSubscription | null> {
    // Prevent concurrent fetches — return the same in-flight Promise
    if (this.subscriptionPromise) {
      return await this.subscriptionPromise;
    }

    this.subscriptionPromise = this.fetchSubscription(isSearching);

    try {
      const result = await this.subscriptionPromise;
      return result;
    } finally {
      this.subscriptionPromise = null;
    }
  }
}
```

### 3. Internationalization - Global Accessibility

#### Dynamic Language Support (`i18n/index.ts`)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Language resources with type safety
import en from './locales/en.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

const LANGUAGE_KEY = 'user_language';

// Detect user's preferred language with fallback
const detectLanguage = (): string => {
  try {
    const locales = getLocales();
    if (locales && locales.length > 0) {
      const preferredLanguage = locales[0].languageCode;
      // Map to supported languages
      return ['en', 'ko', 'zh'].includes(preferredLanguage)
        ? preferredLanguage
        : 'en';
    }
  } catch (error) {
    console.log('Language detection error:', error);
  }
  return 'en'; // Safe fallback
};

i18n.use(initReactI18next).init({
  compatibilityJSON: 'v3',
  resources: {
    en: { translation: en },
    ko: { translation: ko },
    zh: { translation: zh },
  },
  lng: detectLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
```

### 4. Testing Strategy - Reliability Assurance

#### End-to-End Translation Flow (`__tests__/integration/translation-flow.test.ts`)

```typescript
describe('Translation Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockTranslationAPI.translate.mockResolvedValue({
      translation: '안녕하세요',
      pronunciation: 'annyeonghaseyo',
    });
    mockSpeechService.speak.mockResolvedValue();
    mockStorageService.addToHistory.mockResolvedValue();
    mockStorageService.addFavorite.mockResolvedValue();
  });

  describe('Basic Translation Flow', () => {
    test('should complete full translation workflow', async () => {
      const sourceText = 'hello';
      const sourceLanguage = 'en';
      const targetLanguage = 'ko';

      // Step 1: Perform translation
      const result = await TranslationAPI.translate(
        sourceText,
        sourceLanguage,
        targetLanguage
      );
      expect(result.translation).toBe('안녕하세요');

      // Step 2: Save to history
      await StorageService.addToHistory({
        sourceText,
        sourceLanguage,
        targetLanguage,
        translatedText: result.translation,
      });

      // Step 3: Trigger TTS
      await SpeechService.speak(result.translation, targetLanguage);

      expect(mockStorageService.addToHistory).toHaveBeenCalledTimes(1);
      expect(mockSpeechService.speak).toHaveBeenCalledWith(
        '안녕하세요',
        'ko'
      );
    });
  });
});
```

<br/>

## 📁 Project Structure

```
app/
├── (tabs)/                     # Expo Router tab navigation
│   ├── index.tsx              # Main translation interface
│   ├── history.tsx            # Translation history
│   ├── favorites.tsx          # Saved translations
│   ├── settings.tsx           # App configuration
│   └── _layout.tsx            # Tab navigation layout
├── _layout.tsx                # Root application layout
└── +not-found.tsx             # 404 error page

components/                     # Reusable UI components
├── AnimatedLogo.tsx           # Animated splash logo
├── AppLanguageModal.tsx       # App UI language picker
├── CircularUsageButton.tsx    # Circular action button
├── DatePickerModal.tsx        # Date range picker for history
├── ErrorBoundary.tsx          # Error boundary wrapper
├── FavoritesList.tsx          # Saved translations list
├── HistoryList.tsx            # Translation history list
├── LanguageSelector.tsx       # Language picker with flags
├── LanguageModal.tsx          # Full-screen language picker modal
├── Loading.tsx                # Loading indicator
├── SearchInput.tsx            # Translation input with voice
├── SkeletonLoader.tsx         # Skeleton loading placeholders
├── SplashScreen.tsx           # Custom splash screen
├── SplashErrorBoundary.tsx    # Splash-specific error boundary
├── SubscriptionModal.tsx      # Subscription info interface
├── TranslationCard.tsx        # Individual translation result card
├── TranslationList.tsx        # Results display with gestures
├── UsageDetailModal.tsx       # Usage detail view
└── VoiceSettingsModal.tsx     # Voice engine configuration

utils/                         # Business logic services
├── translationAPI.ts          # Multi-provider translation with caching
├── subscriptionService.ts     # User state management
├── userService.ts             # User data and sync
├── premiumService.ts          # Feature flag management
├── deviceUsageService.ts      # Anonymous device tracking
├── speechService.ts           # Voice recognition & TTS
├── pronunciationService.ts    # Phonetic guide generation
├── storage.ts                 # AsyncStorage abstraction layer
├── networkUtils.ts            # Network connectivity helpers
├── supabase.ts                # Database client configuration
├── sentryUtils.ts             # Error reporting utilities
└── version.ts                 # App version helpers

types/                        # TypeScript definitions
├── dictionary.ts             # Translation and language types
├── subscription.ts           # User state type definitions
└── index.ts                  # Shared type exports

stores/                       # Zustand state management
└── subscriptionStore.ts      # User state store

hooks/                        # Custom React hooks
├── useTabSlideAnimation.ts   # Navigation animations
├── useFrameworkReady.ts      # Expo framework readiness
└── index.ts                  # Hook exports

contexts/                     # React contexts
├── ThemeContext.tsx          # Dark/light mode management
└── index.ts                  # Context providers

constants/                    # App configuration
├── bannerAds.ts             # Ad unit configuration
├── legalDocuments.ts        # Terms and privacy links
└── index.ts                 # Constant exports

i18n/                        # Internationalization
├── locales/                 # Translation files
│   ├── en.json             # English translations
│   ├── ko.json             # Korean translations
│   └── zh.json             # Chinese translations
├── index.ts                # i18next configuration
└── types.ts                # Translation key types

__tests__/                   # Test suites
├── components/             # Component unit tests
├── utils/                  # Service integration tests
├── integration/           # Feature end-to-end tests
├── __mocks__/            # Test mocks and fixtures
└── setupTests.ts         # Jest configuration

assets/                     # Static resources
├── images/               # App icons and graphics
├── fonts/               # Custom typography
└── sounds/              # Audio feedback files
```

<br/>

## 📱 UI & UX Screenshots

<div style="display:flex;gap:8px;white-space:nowrap;">
      <img width="240" alt="Simulator Screenshot - iPhone 14 Pro Max - 2025-07-18 at 16 26 23" src="https://github.com/user-attachments/assets/69f1a699-d7d4-4c0e-bcf7-a80685e703af" />
      <img width="240" alt="Simulator Screenshot - iPhone 14 Pro Max - 2025-07-18 at 16 26 52" src="https://github.com/user-attachments/assets/ea53a950-4d15-46ac-9d76-0b4b61d367f2" />
      <img width="240" alt="Simulator Screenshot - iPhone 14 Pro Max - 2025-07-18 at 18 30 45" src="https://github.com/user-attachments/assets/c3de7323-f8d6-45f6-9d53-e828bae2da26" />      
      <img width="240" alt="Simulator Screenshot - iPhone 14 Pro Max - 2025-07-18 at 18 53 00" src="https://github.com/user-attachments/assets/1d32757e-65b3-4995-a0eb-cd53e0e84346" />
      <img width="240" alt="Simulator Screenshot - iPhone 14 Pro Max - 2025-07-18 at 18 53 09" src="https://github.com/user-attachments/assets/a81b2dc9-01d8-4fa9-a22c-2dc386f29892" />
      <img width="240" alt="Simulator Screenshot - iPhone 14 Pro Max - 2025-07-18 at 18 53 18" src="https://github.com/user-attachments/assets/82344002-e48f-4a44-a9e9-2790d76cc074" />
      <img width="240" alt="Simulator Screenshot - iPhone 14 Pro Max - 2025-07-18 at 18 53 45" src="https://github.com/user-attachments/assets/aef6ed6a-4b85-4742-82af-b30a64e2f82d" />
      <img width="240" alt="Simulator Screenshot - iPhone 14 Pro Max - 2025-07-18 at 18 53 58" src="https://github.com/user-attachments/assets/8cef6317-7b2d-41e2-85a2-f62290bed623" />
</div>

---

**© 2026 PolyLingo. All rights reserved.**

Built with ❤️ using React Native, Expo, and TypeScript
