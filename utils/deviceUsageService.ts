import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Dimensions } from 'react-native';
import { getDateString } from './userService';

const DEVICE_USAGE_KEY = 'device_usage_tracking';
const DEVICE_ID_KEY = 'stable_device_id';

export interface DeviceUsageData {
  deviceId: string;
  dailyUsage: {
    [date: string]: number; // YYYY-MM-DD format
  };
  totalUsage: number;
  firstInstallDate: string;
  lastUsageDate: string;
}

/**
 * @description use in device without apple id
 */
export class DeviceUsageService {
  private static deviceId: string | null = null;

  /**
   * 안정적인 디바이스 ID 생성 및 관리
   * 디바이스 특성 기반으로 고유 ID 생성 (앱 재설치 시에도 동일)
   */
  static async getStableDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;

    try {
      let storedId = await AsyncStorage.getItem(DEVICE_ID_KEY);

      if (!storedId) {
        const deviceFingerprint = await this.generateDeviceFingerprint();
        storedId = `device_${deviceFingerprint}`;

        await AsyncStorage.setItem(DEVICE_ID_KEY, storedId);
      }

      this.deviceId = storedId;
      return storedId;
    } catch (error) {
      console.warn('Failed to get device ID, using fallback:', error);

      let fallbackId = await AsyncStorage.getItem('fallback_device_id');
      if (!fallbackId) {
        fallbackId = `fallback_${Date.now()}_${Math.random()
          .toString(36)
          .substring(2, 11)}`;
        await AsyncStorage.setItem('fallback_device_id', fallbackId);
      }

      this.deviceId = fallbackId;
      return fallbackId;
    }
  }

  /**
   * 디바이스 특성 기반 핑거프린트 생성
   * 앱 재설치해도 같은 디바이스라면 동일한 값 생성
   */
  private static async generateDeviceFingerprint(): Promise<string> {
    try {
      const { width, height } = Dimensions.get('screen');
      const platform = Platform.OS;
      const version = Platform.Version.toString();

      const fingerprint = `${platform}_${version}_${width}x${height}`;

      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 32비트 정수로 변환
      }

      const hashedId = Math.abs(hash).toString(16);

      return hashedId;
    } catch (error) {
      console.warn('Failed to generate device fingerprint:', error);
      return Date.now().toString(36);
    }
  }

  /**
   * 디바이스 사용량 데이터 로드
   */
  static async getDeviceUsageData(): Promise<DeviceUsageData> {
    try {
      const deviceId = await this.getStableDeviceId();
      const stored = await AsyncStorage.getItem(DEVICE_USAGE_KEY);

      if (stored) {
        const data = JSON.parse(stored) as DeviceUsageData;

        // 디바이스 ID가 다르면 새 데이터 생성 (다른 디바이스)
        if (data.deviceId !== deviceId) {
          return this.createNewDeviceUsage(deviceId);
        }

        return data;
      }

      return this.createNewDeviceUsage(deviceId);
    } catch (error) {
      console.error('Failed to load device usage data:', error);
      const deviceId = await this.getStableDeviceId();
      return this.createNewDeviceUsage(deviceId);
    }
  }

  private static createNewDeviceUsage(deviceId: string): DeviceUsageData {
    return {
      deviceId,
      dailyUsage: {},
      totalUsage: 0,
      firstInstallDate: getDateString(),
      lastUsageDate: getDateString(),
    };
  }

  static async incrementUsageWithLimits(increment: number = 1): Promise<{
    allowed: boolean;
    reason?: string;
    remainingDaily?: number;
  }> {
    try {
      const data = await this.getDeviceUsageData();
      const today = getDateString();

      // 현재 일일 사용량 계산
      const dailyUsage = data.dailyUsage[today] || 0;

      // 일일 제한만 검사
      const DAILY_LIMIT = 100;

      if (dailyUsage + increment > DAILY_LIMIT) {
        return {
          allowed: false,
          reason: 'daily_limit_exceeded',
          remainingDaily: Math.max(0, DAILY_LIMIT - dailyUsage),
        };
      }

      // 사용량 업데이트
      data.dailyUsage[today] = dailyUsage + increment;
      data.totalUsage += increment;
      data.lastUsageDate = today;

      await AsyncStorage.setItem(DEVICE_USAGE_KEY, JSON.stringify(data));

      return {
        allowed: true,
        remainingDaily: DAILY_LIMIT - data.dailyUsage[today],
      };
    } catch (error) {
      console.error('Failed to increment usage:', error);
      return { allowed: false, reason: 'system_error' };
    }
  }

  static async getCurrentUsageStats(): Promise<{
    daily: { used: number; limit: number; remaining: number };
    total: number;
  }> {
    try {
      const data = await this.getDeviceUsageData();
      const today = getDateString();

      const dailyUsed = data.dailyUsage[today] || 0;
      const DAILY_LIMIT = 100;

      return {
        daily: {
          used: dailyUsed,
          limit: DAILY_LIMIT,
          remaining: Math.max(0, DAILY_LIMIT - dailyUsed),
        },
        total: data.totalUsage,
      };
    } catch (error) {
      console.error('Failed to get usage stats:', error);
      return {
        daily: { used: 0, limit: 100, remaining: 100 },
        total: 0,
      };
    }
  }

  /**
   * 오래된 사용량 데이터 정리 (성능 최적화)
   * 30일 이전 일일 사용량 데이터 삭제
   */
  static async cleanupOldUsageData(): Promise<void> {
    try {
      const data = await this.getDeviceUsageData();
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // 30일 이전 일일 사용량 데이터 삭제
      const cutoffDate = getDateString(thirtyDaysAgo);

      Object.keys(data.dailyUsage).forEach((date) => {
        if (date < cutoffDate) {
          delete data.dailyUsage[date];
        }
      });

      await AsyncStorage.setItem(DEVICE_USAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to cleanup old usage data:', error);
    }
  }
}
