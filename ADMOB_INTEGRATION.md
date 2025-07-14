# AdMob Integration Guide

이 문서는 React Native 앱에 Google AdMob 배너 광고를 통합하는 방법을 설명합니다.

## 🚀 구현된 기능

### 1. AdMob 설정
- `expo-ads-admob` 라이브러리 사용 (Expo SDK 53 호환)
- 조건부 로딩으로 에러 방지
- 테스트 광고 ID 사용 (개발용)

### 2. 광고 위치
다음 페이지에 배너 광고가 추가되었습니다:
- **검색 페이지** (`app/(tabs)/index.tsx`)
- **즐겨찾기 페이지** (`app/(tabs)/favorites.tsx`) 
- **히스토리 페이지** (`app/(tabs)/history.tsx`)

### 3. 프리미엄 사용자 처리
- 프리미엄 사용자에게는 광고가 표시되지 않음
- `PremiumService` 유틸리티로 상태 관리
- AsyncStorage를 통한 영구 저장

## 📁 파일 구조

```
utils/
└── premiumService.ts     # 프리미엄 상태 관리
app/
├── _layout.tsx          # AdMob 초기화
└── (tabs)/
    ├── index.tsx        # 검색 페이지 광고
    ├── favorites.tsx    # 즐겨찾기 페이지 광고
    └── history.tsx      # 히스토리 페이지 광고
app.json                 # AdMob 플러그인 설정
```

## ⚙️ 설정 파일

### app.json
```json
{
  "plugins": [
    [
      "react-native-google-mobile-ads",
      {
        "android_app_id": "ca-app-pub-3940256099942544~3347511713",
        "ios_app_id": "ca-app-pub-3940256099942544~1458002511"
      }
    ]
  ]
}
```

### package.json
```json
{
  "dependencies": {
    "react-native-google-mobile-ads": "^15.4.0"
  }
}
```

## 💻 코드 예시

### 배너 광고 컴포넌트
```tsx
// AdMob import - 에러 방지를 위해 조건부 로드
let AdMobBanner: any = null;
try {
  AdMobBanner = require('expo-ads-admob').AdMobBanner;
} catch (error) {
  console.log('AdMob not available:', error);
}

// 광고 표시
{!isPremiumUser && AdMobBanner && (
  <AdMobBanner
    bannerSize="smartBannerPortrait"
    adUnitID="ca-app-pub-3940256099942544/6300978111" // 테스트용 ID
    servePersonalizedAds={true}
    onDidFailToReceiveAdWithError={(err) => console.log('Banner ad failed to load:', err)}
  />
)}
```

### AdMob 초기화
`expo-ads-admob`는 Expo 빌드 시 자동으로 초기화되므로 별도의 초기화 코드가 필요하지 않습니다.

### 프리미엄 서비스 (utils/premiumService.ts)
```tsx
export class PremiumService {
  static async isPremiumUser(): Promise<boolean> {
    // AsyncStorage에서 프리미엄 상태 확인
  }
  
  static async setPremiumUser(isPremium: boolean): Promise<void> {
    // 프리미엄 상태 설정
  }
  
  static async shouldShowAds(): Promise<boolean> {
    // 광고 표시 여부 결정
  }
}
```

## 🛠️ 실제 배포를 위한 설정

### 1. 실제 AdMob 계정 설정
1. [Google AdMob 콘솔](https://admob.google.com/)에서 계정 생성
2. 앱 등록 및 광고 단위 생성
3. 실제 광고 단위 ID로 교체

### 2. 광고 단위 ID 교체
```tsx
// 개발용 (현재)
unitId={TestIds.BANNER}

// 실제 배포용
unitId="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
```

### 3. app.json의 App ID 교체
```json
{
  "android_app_id": "ca-app-pub-YOUR_PUBLISHER_ID~YOUR_ANDROID_APP_ID",
  "ios_app_id": "ca-app-pub-YOUR_PUBLISHER_ID~YOUR_IOS_APP_ID"
}
```

## 🎯 광고 타입별 구현

### 현재 구현: 배너 광고
- 페이지 하단에 고정
- 스마트 배너 사이즈 사용
- 프리미엄 사용자에게는 숨김

### 추가 가능한 광고 타입
1. **전면 광고 (Interstitial)**
   - 번역 완료 후 표시
   - 일정 횟수마다 표시

2. **보상형 광고 (Rewarded)**
   - 프리미엄 기능 체험용
   - 광고 시청 후 혜택 제공

3. **네이티브 광고 (Native)**
   - 검색 결과에 자연스럽게 통합
   - 더 높은 CTR 기대

## 🔧 문제 해결

### 광고가 표시되지 않는 경우
1. 네트워크 연결 확인
2. AdMob 초기화 상태 확인
3. 광고 단위 ID 정확성 검증
4. 콘솔 로그에서 에러 메시지 확인

### 개발 중 테스트
- 항상 테스트 광고 ID 사용
- 실제 광고 클릭 시 계정 정지 위험
- 디바이스를 테스트 디바이스로 등록 권장

## 📈 성능 최적화

1. **광고 로드 최적화**
   - 페이지 로드와 함께 광고 요청
   - 광고 로드 실패 시 재시도 로직

2. **메모리 관리**
   - 컴포넌트 언마운트 시 광고 정리
   - 불필요한 광고 요청 방지

3. **사용자 경험**
   - 광고 로드 중 레이아웃 시프트 방지
   - 적절한 광고 빈도 유지

## 🔒 개인정보 보호

- GDPR 및 CCPA 준수
- 사용자 동의 관리
- 개인화되지 않은 광고 옵션 제공

## 📊 분석 및 수익화

- AdMob 대시보드에서 성과 모니터링
- eCPM, CTR, 수익 등 주요 지표 추적
- A/B 테스트를 통한 최적화

---

이 가이드를 따라 AdMob 통합을 완료하고, 실제 배포 전에 테스트를 충분히 진행하시기 바랍니다.