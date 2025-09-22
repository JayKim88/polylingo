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

Integrating Claude AI's translation capabilities with Wiktionary's dictionary data, this app provides detailed word definitions, pronunciations, and contextual meanings alongside accurate translations.

Supporting 14 languages with parallel translation to multiple targets simultaneously (3 for free users, 5 for premium), the app includes advanced features like speech recognition, offline caching, and real-time state synchronization.

Built as a commercial-ready application with subscription monetization, Apple In-App Purchases, and full iOS ecosystem integration.

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

- **Claude API** for AI-powered translation with phonetic transcription
- **Wiktionary REST API** for real-time word definitions, part-of-speech classification, and contextual meanings lookup
- **MyMemory API** as intelligent fallback translation provider
- **Supabase PostgreSQL** for user data and subscription management
- **Sentry** for real-time error tracking and performance monitoring

**Platform Integrations**

- **Apple In-App Purchases** with iOS StoreKit integration
- **Google Mobile Ads** for banner advertising (AdMob)
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

- **Multi-Language Parallel Translation**: Support for 14 languages with simultaneous translation to up to 5 languages (premium) or 3 languages (free)
- **Parallel Processing Optimization**: Asynchronous translation per language to minimize user wait time
- **Smart Caching System**: 24-hour memory caching with offline access support
- **Translation Error Recovery**: Auto-retry logic, API fallback, and individual language state management

**Audio & Voice Features**

- **Speech Recognition & TTS**: Real-time voice input with phonetic transcription
- **Pronunciation Guides**: Claude AI-powered phonetic transcription with audio output
- **Multi-Language Voice Support**: Speech recognition across all 14 supported languages

**Business Model & Monetization**

- **Subscription-Based Monetization**: Usage limits and ad management through free/premium tiers
- **Apple Ecosystem Integration**: Native Apple Sign-In and iOS In-App Purchase support
- **Privacy-First Design**: Minimal data collection with local-first storage approach

**Advanced User Experience**

- **Favorites & History Management**: Date-based translation records with intelligent search
- **User Customization**: Drag-and-drop language priority settings
- **Usage Analytics**: Daily translation limit visualization with subscription status monitoring
- **Dark/Light Theme Support**: User preference-based theme switching with system integration

<br/>

## 🏗 Architecture & Data Management

### Hybrid Data Architecture

**Local-First with Cloud Sync**

- **AsyncStorage Primary**: Offline-first experience with Supabase synchronization
- **Multi-Layer Caching**: Translation results (24h memory), user sessions, and subscription state
- **Race Condition Prevention**: Subscription update locks and concurrent request handling

**Transaction-Only Database Design (Abstract schema example below)**

```sql
-- Production-Ready PostgreSQL Schema
-- Pure transaction-based architecture eliminating user accounts

 -- Subscription Management
  CREATE TABLE tbl_sub (
    k1 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_ref TEXT NOT NULL,                               -- Plan reference identifier
    flag_active BOOLEAN DEFAULT true,                     -- Active status flag
    ext_tx_id TEXT UNIQUE NOT NULL,                       -- External transaction identifier (primary key)
    ts_start TIMESTAMP WITH TIME ZONE NOT NULL,           -- Period start timestamp
    ts_end TIMESTAMP WITH TIME ZONE,                      -- Period end timestamp (NULL for indefinite)
    ts_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),    -- Record creation timestamp
    ts_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()     -- Last update timestamp
  );

  -- Daily Usage Tracking (Transaction + Date + Period composite key)
  CREATE TABLE tbl_usage (
    k2 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ext_tx_id TEXT NOT NULL,                              -- External transaction reference
    day_key DATE NOT NULL,                                -- Usage day identifier
    metric_val DECIMAL NOT NULL DEFAULT 0,                -- Usage metric value
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,       -- Validation period start
    period_end TIMESTAMP WITH TIME ZONE,                  -- Validation period end
    ts_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),    -- Record creation timestamp
    ts_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),    -- Last update timestamp
    UNIQUE(ext_tx_id, period_start, period_end)           -- Composite uniqueness constraint
  );

  -- Performance Indexes
  CREATE INDEX idx_sub_tx_lookup ON tbl_sub(ext_tx_id);
  CREATE INDEX idx_sub_active_filter ON tbl_sub(flag_active, ext_tx_id);
  CREATE INDEX idx_usage_tx_day ON tbl_usage(ext_tx_id, day_key);
  CREATE INDEX idx_usage_period_lookup ON tbl_usage(ext_tx_id, period_start, period_end);
```

**Apple Date Synchronization Strategy**

- **Three-Piece Validation**: `originalTransactionIdentifierIOS` + `startDate` + `endDate`
- **Server-Side Validation**: Apple receipt verification with fraud detection
- **Conflict Resolution**: Composite key upsert operations ensuring data consistency

</br>

## 💡 Code Quality & Architecture Highlights

### 1. TypeScript Implementation - Precise Type Safety

#### Comprehensive Domain Models (`types/subscription.ts`)

```typescript
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  currency: string;
  period: 'monthly' | 'yearly';
  dailyTranslations: number;
  maxLanguages: number;
  hasAds: boolean;
  features: string[];
}

export interface UserSubscription {
  planId: string;
  isActive: boolean;
  startDate: number;
  endDate: number;
  dailyUsage: {
    date: string;
    count: number;
  };
  isTrialUsed: boolean;
  originalTransactionIdentifierIOS?: string;
}

// Strongly-typed IAP product identifiers
export const IAP_PRODUCT_IDS = {
  PRO_MONTHLY: 'com.polylingo.pro.monthly',
  PRO_MAX_MONTHLY: 'com.polylingo.promax.monthly',
  PREMIUM_YEARLY: 'com.polylingo.premium.yearly',
} as const;
```

#### Type-Safe State Management (`stores/subscriptionStore.ts`)

```typescript
interface SubscriptionState {
  isCheckingSubscription: boolean;
  setIsCheckingSubscription: (isChecking: boolean) => void;
}

export const useSubscriptionStore = create<SubscriptionState>((set) => ({
  isCheckingSubscription: false,
  setIsCheckingSubscription: (isChecking: boolean) =>
    set({ isCheckingSubscription: isChecking }),
}));
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
    options?: { provider?: 'claude' | 'default' }
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

#### Subscription State Synchronization (`utils/subscriptionService.ts`)

```typescript
export class SubscriptionService {
  private static isUpdating = false;
  private static subscriptionPromise: Promise<UserSubscription | null> | null =
    null;

  static async getCurrentSubscription(
    isSearching?: boolean
  ): Promise<UserSubscription | null> {
    // Prevent concurrent subscription fetches
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

  private static async fetchSubscription(
    isSearching?: boolean
  ): Promise<UserSubscription | null> {
    try {
      // Try to get subscription by transaction ID first (if available from purchases)
      const serverSubscription =
        await this.getServerSubscriptionByTransaction();
      if (serverSubscription) {
        return await this.processServerSubscription(
          serverSubscription,
          isSearching
        );
      }

      return await this.getLocalSubscriptionOrDefault();
    } catch (error) {
      return await this.handleSubscriptionError(error);
    }
  }
}
```

### 3. Subscription Lifecycle Management - Zero-Registration Architecture

#### Transaction-Based User Management (`utils/userService.ts`)

```typescript
export class UserService {
  private static currentTransactionId: string | null = null;
  private static syncLocks = new Map<string, Promise<boolean>>();

  // Transaction ID as primary identifier (no user accounts)
  static async saveTransactionId(transactionId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(
        'original_transaction_identifier_ios',
        transactionId
      );
      this.currentTransactionId = transactionId;
    } catch (error) {
      console.error('Failed to save transaction ID:', error);
    }
  }

  // Three-piece validation: Transaction ID + Apple start/end dates
  private static async performSyncSubscription(
    planId: string,
    isActive: boolean,
    startDate: number,
    endDate: number,
    originalTransactionIdentifierIOS: string
  ): Promise<boolean> {
    try {
      const startDateISO = new Date(startDate).toISOString();
      const endDateISO = endDate > 0 ? new Date(endDate).toISOString() : null;

      // Composite key upsert with conflict resolution
      const { error } = await supabase!.from('user_subscriptions').upsert(
        [
          {
            plan_id: planId,
            is_active: isActive,
            original_transaction_identifier_ios:
              originalTransactionIdentifierIOS,
            start_date: startDateISO,
            end_date: endDateISO,
          },
        ],
        {
          onConflict: 'original_transaction_identifier_ios,start_date,end_date',
          ignoreDuplicates: false,
        }
      );

      if (error) return false;

      return true;
    }
  }
}
```

### 4. Internationalization - Global Accessibility

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

### 5. Testing Strategy - Reliability Assurance

#### Comprehensive Service Testing (`__tests__/utils/subscriptionService.test.ts`)

```typescript
describe('SubscriptionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton state
    SubscriptionService['subscriptionPromise'] = null;
    SubscriptionService['isUpdating'] = false;
  });

  describe('Usage Validation', () => {
    it('should correctly calculate multi-language usage limits', async () => {
      const mockSubscription: UserSubscription = {
        planId: 'pro_monthly',
        isActive: true,
        dailyUsage: { date: '2024-01-15', count: 150 },
        // ... other properties
      };

      jest
        .spyOn(SubscriptionService, 'getCurrentSubscription')
        .mockResolvedValue(mockSubscription);

      // Pro plan: 200 daily translations, 5 max languages
      const canTranslate3Languages = await SubscriptionService.canTranslate(3);
      const canTranslate5Languages = await SubscriptionService.canTranslate(5);

      expect(canTranslate3Languages).toBe(true); // 150 + 3/5 = 150.6 < 200
      expect(canTranslate5Languages).toBe(false); // 150 + 5/5 = 151 < 200, but edge case
    });

    it('should handle concurrent subscription requests', async () => {
      let resolveCount = 0;
      jest
        .spyOn(SubscriptionService, 'getCurrentSubscription')
        .mockImplementation(() => {
          resolveCount++;
          return Promise.resolve(mockSubscription);
        });

      // Simulate concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => SubscriptionService.getCurrentSubscription());

      await Promise.all(promises);

      // Should only make one actual API call due to promise caching
      expect(resolveCount).toBe(1);
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
├── LanguageSelector.tsx       # Language picker with flags
├── SearchInput.tsx            # Translation input with voice
├── TranslationList.tsx        # Results display with gestures
├── SubscriptionModal.tsx      # Premium upgrade interface
└── CircularUsageButton.tsx    # Real-time usage indicator

utils/                         # Business logic services
├── translationAPI.ts          # Multi-provider translation
├── subscriptionService.ts     # Premium feature management
├── iapService.ts             # Apple In-App Purchase integration
├── userService.ts            # User data and sync
├── deviceUsageService.ts     # Anonymous usage tracking
├── speechService.ts          # Voice recognition & TTS
├── pronunciationService.ts   # Phonetic guide generation
└── supabase.ts               # Database client configuration

types/                        # TypeScript definitions
├── dictionary.ts             # Translation and language types
├── subscription.ts           # Premium plan definitions
└── index.ts                  # Shared type exports

stores/                       # Zustand state management
├── subscriptionStore.ts      # Premium status state
└── index.ts                  # Store composition

hooks/                        # Custom React hooks
├── useTabSlideAnimation.ts   # Navigation animations
└── index.ts                  # Hook exports

contexts/                     # React contexts
├── ThemeContext.tsx          # Dark/light mode management
└── index.ts                  # Context providers

constants/                    # App configuration
├── bannerAds.ts             # AdMob integration config
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

**© 2025 PolyLingo. All rights reserved.**

Built with ❤️ using React Native, Expo, and TypeScript
