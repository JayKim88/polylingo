<div style="display: flex; gap: 16px; overflow-x: auto;">  
  <img src="https://github.com/user-attachments/assets/d3e0d611-ae78-439d-ac2d-620b58ebc209"
       style="width: 240px; height: auto;" />
  <img src="https://github.com/user-attachments/assets/691d7ab9-40c4-4d80-beab-002c7fbbedac"
       style="width: 240px; height: auto;" />
  <img src="https://github.com/user-attachments/assets/f11a25a5-36c8-48b0-801c-19069ab2f3cf"
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
- **NativeWind** for utility-first styling with responsive design

**Backend & Infrastructure**

- **Google Translate API** for primary translation with phonetic transliteration
- **MyMemory API** as fallback translation provider
- **Dictionary API** (`dictionaryapi.dev`) for English IPA pronunciation
- **Supabase PostgreSQL** for user data management
- **Sentry** for real-time error tracking and performance monitoring

**Platform Integrations**

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
- **Architecture Migration**: Transitioned from a subscription-based model with a self-hosted server API to a free app using Google Translate direct integration — maintaining full feature parity while reducing infrastructure cost to zero

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

<br/>

## 📦 Version History & Architecture Evolution

### v1.0.4 — Subscription-Based Full Stack (Original)

The initial release was a full-stack paid app with a 3-tier subscription model (Free / Pro / Premium).

**Translation Pipeline**

- **Claude API** (via self-hosted Next.js server) as the primary translation provider with AI-powered phonetic transcription
- **Wiktionary REST API** for word definitions and part-of-speech classification
- **MyMemory API** as fallback — automatic failover across 3 providers

**Monetisation & Auth**

- 3-tier subscription model (Free / Pro Monthly / Premium Yearly) with **Apple IAP** (`react-native-iap`)
- Real-time subscription renewal detection via Apple IAP receipt validation
- Daily translation limits enforced per plan (100 / 200 / 500)
- **Supabase PostgreSQL** for user subscription state and daily usage sync across devices

**Backend**

- Dedicated Next.js API server (`polylingo-server`) handling translation requests and subscription verification
- Transaction-ID-based user identity (zero-registration) synced to Supabase

---

### v1.0.5 — Free App (Current)

Migrated from subscription-based model to a fully free app, restructuring the translation pipeline to reduce infrastructure cost to zero while maintaining feature parity.

**What changed**

- Removed self-hosted server API → **Google Translate API** direct integration (client-side)
- Removed IAP and subscription enforcement
- Removed daily usage limits
- Supabase sync retained in codebase; not active in primary flow

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

Prevents duplicate in-flight async requests by sharing a single Promise reference across concurrent callers.

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
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';

const LANGUAGE_STORAGE_KEY = 'app_language';

// Async language detector — reads persisted preference, falls back to device locale
const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage) return callback(savedLanguage);

      const RNLocalize = require('react-native-localize');
      const deviceLanguage = RNLocalize.getLocales()[0]?.languageCode;
      const supported = ['ko', 'en', 'zh'];
      callback(supported.includes(deviceLanguage) ? deviceLanguage : 'en');
    } catch {
      callback('en');
    }
  },
  init: () => {},
  cacheUserLanguage: async (lng: string) => {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ko: { translation: ko },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'ko', 'zh'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
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
        searchedData: [{ lng: targetLanguage, text: result.translation }],
      });

      // Step 3: Trigger TTS
      await SpeechService.speak(result.translation, targetLanguage);

      expect(mockStorageService.addToHistory).toHaveBeenCalledTimes(1);
      expect(mockSpeechService.speak).toHaveBeenCalledWith('안녕하세요', 'ko');
    });
  });

  describe('Multi-Language Translation Flow', () => {
    test('should translate to multiple languages concurrently', async () => {
      mockTranslationAPI.translateToMultipleLanguages.mockResolvedValue([
        { sourceLanguage: 'en', targetLanguage: 'ko', sourceText: 'hello',
          translatedText: '안녕하세요', confidence: 0.9, timestamp: Date.now() },
        { sourceLanguage: 'en', targetLanguage: 'ja', sourceText: 'hello',
          translatedText: 'こんにちは', confidence: 0.9, timestamp: Date.now() },
      ]);

      const results = await TranslationAPI.translateToMultipleLanguages(
        'hello', 'en', ['ko', 'ja']
      );

      expect(results).toHaveLength(2);
      expect(results[0].translatedText).toBe('안녕하세요');
      expect(results[1].translatedText).toBe('こんにちは');
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
├── GoogleIcon.tsx             # Google icon asset
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
├── subscriptionService.ts     # Ad display and user state management
├── userService.ts             # User data and sync
├── iapService.ts              # In-app purchase utilities
├── premiumService.ts          # Feature flag management
├── deviceUsageService.ts      # Device-based usage tracking
├── speechService.ts           # Voice recognition & TTS
├── pronunciationService.ts    # Phonetic guide generation
├── storage.ts                 # AsyncStorage abstraction layer
├── networkUtils.ts            # Network connectivity helpers
├── supabase.ts                # Database client configuration
├── sentryUtils.ts             # Error reporting utilities
└── version.ts                 # App version helpers

types/                        # TypeScript definitions
├── dictionary.ts             # Translation and language types
└── subscription.ts           # User state type definitions

stores/                       # Zustand state management
└── subscriptionStore.ts      # User state store

hooks/                        # Custom React hooks
├── useTabSlideAnimation.ts   # Navigation animations
└── useFrameworkReady.ts      # Expo framework readiness

contexts/                     # React contexts
└── ThemeContext.tsx          # Dark/light mode management

constants/                    # App configuration
├── bannerAds.ts             # Ad unit configuration
└── legalDocuments.ts        # Terms and privacy links

i18n/                        # Internationalization
├── locales/                 # Translation files
│   ├── en.json             # English translations
│   ├── ko.json             # Korean translations
│   └── zh.json             # Chinese translations
├── index.ts                # i18next configuration
└── types.ts                # Translation key types

__tests__/                   # Test suites
├── components/             # Component unit tests
├── utils/                  # Service unit & integration tests
└── integration/           # Feature end-to-end tests

assets/                     # Static resources
└── images/               # App icons and graphics
```

<br/>

## 📱 UI & UX Screenshots

<div style="display:flex;gap:8px;white-space:nowrap;">
<img width="240" alt="intro" src="https://github.com/user-attachments/assets/50fa8c9a-a882-47f8-8b4e-72b7b84188ac" />
<img width="240" alt="translate" src="https://github.com/user-attachments/assets/143649c4-622c-4568-8c5e-b13e5d899486" />
<img width="240" alt="language selection" src="https://github.com/user-attachments/assets/f61c15e3-6198-4b7c-afe0-cf807f3606a8" />
<img width="240" alt="voice settings" src="https://github.com/user-attachments/assets/22dd552a-ddf5-4ffb-9471-797b92694b2e" />
<img width="240" alt="history" src="https://github.com/user-attachments/assets/5fd117c8-da61-4c23-b80b-52e6fbf21e32" />
<img width="240" alt="favorite" src="https://github.com/user-attachments/assets/14764ebb-ece7-4d2d-a87b-fc49baf22db3" />
<img width="240" alt="settings" src="https://github.com/user-attachments/assets/2f358014-4e77-4609-bb0e-742506249051" />
<img width="240" alt="app language" src="https://github.com/user-attachments/assets/9640f4f7-160c-464c-9184-4e4cffe0e9a1" />
<img width="240" alt="supported language" src="https://github.com/user-attachments/assets/67aa299a-13b8-4f04-9bf3-7a8234cc99a0" />
<img width="240" alt="export data" src="https://github.com/user-attachments/assets/6fa4cd7c-d915-485e-b038-4747ad0c2d82" />
<img width="240" alt="dark mode" src="https://github.com/user-attachments/assets/7c4d354e-26f9-44dd-b020-07f3748b7932" />
</div>

---

**© 2026 PolyLingo. All rights reserved.**

Built with ❤️ using React Native, Expo, and TypeScript
