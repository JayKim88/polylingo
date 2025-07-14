import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import { SubscriptionService } from '../utils/subscriptionService';
import { useFocusEffect } from '@react-navigation/native';

export default function UsageIndicator() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [usage, setUsage] = useState({ used: 0, limit: 100, remaining: 100 });
  const [planId, setPlanId] = useState('free');

  const loadUsage = async () => {
    try {
      const [usageData, subscription] = await Promise.all([
        SubscriptionService.getDailyUsage(),
        SubscriptionService.getCurrentSubscription(),
      ]);
      
      setUsage(usageData);
      setPlanId(subscription?.planId || 'free');
    } catch (error) {
      console.error('Error loading usage:', error);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadUsage();
    }, [])
  );

  // 사용량 퍼센티지 계산
  const usagePercentage = (usage.used / usage.limit) * 100;
  
  // 상태에 따른 색상 결정
  const getStatusColor = () => {
    if (usagePercentage >= 95) return '#EF4444'; // 빨간색 (위험)
    if (usagePercentage >= 80) return '#F59E0B'; // 주황색 (주의)
    return '#10B981'; // 초록색 (안전)
  };

  // 플랜별 언어 수에 따른 안내 메시지
  const getUsageDescription = () => {
    if (planId === 'free') {
      return t('subscription.features.freeUsageDescription') || 
        '1개 언어 = 0.5회, 2개 언어 = 1회 사용량';
    }
    return t('subscription.features.premiumUsageDescription') || 
      '1개 언어 = 0.2회, 5개 언어 = 1회 사용량';
  };

  return (
    <TouchableOpacity
      className="mx-6 my-2 p-3 rounded-2xl"
      style={{
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
      onPress={loadUsage}
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text
          className="text-sm font-medium"
          style={{ color: colors.text }}
        >
          {t('subscription.dailyUsage', { used: usage.used.toFixed(1), limit: usage.limit })}
        </Text>
        <Text
          className="text-xs font-bold"
          style={{ color: getStatusColor() }}
        >
          {usage.remaining.toFixed(1)} {t('subscription.remaining')}
        </Text>
      </View>
      
      {/* 사용량 진행 바 */}
      <View
        className="h-2 rounded-full mb-2"
        style={{ backgroundColor: colors.background }}
      >
        <View
          className="h-full rounded-full"
          style={{
            backgroundColor: getStatusColor(),
            width: `${Math.min(usagePercentage, 100)}%`,
          }}
        />
      </View>
      
      <Text
        className="text-xs"
        style={{ color: colors.textSecondary }}
      >
        {getUsageDescription()}
      </Text>
    </TouchableOpacity>
  );
}