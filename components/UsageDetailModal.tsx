import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  Animated,
  Dimensions,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../contexts/ThemeContext';
import { SUBSCRIPTION_PLANS } from '../types/subscription';
import { useSubscriptionStore } from '../stores/subscriptionStore';
import { SubscriptionService } from '@/utils/subscriptionService';
import Loading from './Loading';

const { height } = Dimensions.get('window');

interface UsageDetailModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function UsageDetailModal({
  visible,
  onClose,
}: UsageDetailModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [usage, setUsage] = useState({ used: 0, limit: 100, remaining: 100 });
  const [planId, setPlanId] = useState('free');
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const { isCheckingSubscription } = useSubscriptionStore();

  const okButtonScale = useRef(new Animated.Value(1)).current;

  const loadUsageData = async () => {
    try {
      const [usageData, subscription] = await Promise.all([
        SubscriptionService.getDailyUsage(),
        SubscriptionService.getCurrentSubscription(),
      ]);

      setUsage(usageData);
      setPlanId(subscription?.planId || 'free');

      const plan = SUBSCRIPTION_PLANS.find(
        (p) => p.id === (subscription?.planId || 'free')
      );
      setCurrentPlan(plan);
    } catch (error) {
      console.error('Error loading usage data:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      loadUsageData();
    }
  }, [visible, isCheckingSubscription]);

  const usagePercentage = (usage.used / usage.limit) * 100;

  const getStatusColor = () => {
    if (usagePercentage >= 95) return '#EF4444'; // Red
    if (usagePercentage >= 80) return '#F59E0B'; // Orange
    return '#10B981'; // Green
  };

  const getPlanDisplayName = () => {
    switch (planId) {
      case 'free':
        return t('subscription.free');
      case 'pro_monthly':
        return t('subscription.pro');
      case 'pro_max_monthly':
        return t('subscription.proMax');
      case 'premium_yearly':
        return t('subscription.premium');
      default:
        return t('subscription.free');
    }
  };

  const getUsageDescription = () => {
    if (planId === 'free') {
      return (
        t('subscription.features.freeUsageDescription') ||
        '1개 언어 = 0.5회, 2개 언어 = 1회 사용량'
      );
    }
    return (
      t('subscription.features.premiumUsageDescription') ||
      '1개 언어 = 0.2회, 5개 언어 = 1회 사용량'
    );
  };

  const animateButton = (scale: number) => {
    Animated.spring(okButtonScale, {
      toValue: scale,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View
          className="rounded-t-3xl overflow-hidden"
          style={{ maxHeight: height * 0.8, backgroundColor: colors.surface }}
        >
          <SafeAreaView style={{ backgroundColor: colors.surface }}>
            <KeyboardAvoidingView
              style={{ backgroundColor: colors.surface }}
              behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
            >
              <View
                className="flex-row justify-between items-center px-5 pt-5 pb-4 border-b"
                style={{ borderBottomColor: colors.border }}
              >
                <Text
                  className="text-xl font-bold"
                  style={{ color: colors.text }}
                >
                  {t('subscription.dailyUsage', {
                    used: '',
                    limit: '',
                  }).replace(': /', '')}
                </Text>
                <TouchableOpacity onPress={onClose} className="p-2">
                  <X size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View className="px-5 py-6">
                {isCheckingSubscription && (
                  <Loading
                    isHeaderVisible={false}
                    message={t('loading.loadingUpdateSubscription')}
                  />
                )}
                <>
                  <View className="mb-6">
                    <Text
                      className="text-sm font-medium mb-2"
                      style={{ color: colors.textSecondary }}
                    >
                      {t('subscription.currentPlan')}
                    </Text>
                    <View
                      className="p-3 rounded-2xl"
                      style={{ backgroundColor: colors.background }}
                    >
                      <Text
                        className="text-lg font-bold"
                        style={{ color: colors.text }}
                      >
                        {getPlanDisplayName()}
                      </Text>
                      {currentPlan && (
                        <Text
                          className="text-sm mt-1"
                          style={{ color: colors.textSecondary }}
                        >
                          {currentPlan.price} •{' '}
                          {currentPlan.period === 'yearly'
                            ? t('subscription.yearly')
                            : t('subscription.monthly')}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-4">
                      <Text
                        className="text-lg font-semibold"
                        style={{ color: colors.text }}
                      >
                        {usage.used.toFixed(1)} / {usage.limit}
                      </Text>
                      <Text
                        className="text-sm font-bold"
                        style={{ color: getStatusColor() }}
                      >
                        {usage.remaining.toFixed(1)}{' '}
                        {t('subscription.remaining')}
                      </Text>
                    </View>

                    <View
                      className="h-3 rounded-full mb-4"
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
                      className="text-sm text-center"
                      style={{ color: colors.textSecondary }}
                    >
                      {getUsageDescription()}
                    </Text>
                  </View>
                  {currentPlan && (
                    <View className="mb-6">
                      <Text
                        className="text-sm font-medium mb-3"
                        style={{ color: colors.textSecondary }}
                      >
                        {t('subscription.features.basicTranslation')}
                      </Text>
                      <View className="space-y-2">
                        <View className="flex-row items-center">
                          <View
                            className="w-2 h-2 rounded-full mr-3"
                            style={{ backgroundColor: colors.text }}
                          />
                          <Text
                            className="text-sm flex-1"
                            style={{ color: colors.text }}
                          >
                            {planId === 'free'
                              ? t('subscription.features.twoLanguages')
                              : t('subscription.features.fiveLanguages')}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <View
                            className="w-2 h-2 rounded-full mr-3"
                            style={{ backgroundColor: colors.text }}
                          />
                          <Text
                            className="text-sm flex-1"
                            style={{ color: colors.text }}
                          >
                            {planId === 'free'
                              ? t('subscription.features.dailyLimit100')
                              : planId === 'pro_max_monthly'
                              ? t('subscription.features.dailyLimit500')
                              : t('subscription.features.dailyLimit200')}
                          </Text>
                        </View>
                        <View className="flex-row items-center">
                          <View
                            className="w-2 h-2 rounded-full mr-3"
                            style={{ backgroundColor: colors.text }}
                          />
                          <Text
                            className="text-sm flex-1"
                            style={{ color: colors.text }}
                          >
                            {currentPlan.hasAds
                              ? t('subscription.features.adSupported')
                              : t('subscription.features.noAds')}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}
                  <Animated.View
                    style={{ transform: [{ scale: okButtonScale }] }}
                  >
                    <TouchableOpacity
                      onPress={onClose}
                      className="w-full h-12 rounded-2xl items-center justify-center"
                      style={{ backgroundColor: colors.text }}
                      onPressIn={() => animateButton(0.95)}
                      onPressOut={() => animateButton(1)}
                      activeOpacity={1}
                    >
                      <Text
                        className="font-semibold"
                        style={{ color: colors.background }}
                      >
                        {t('alert.confirm')}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                </>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
}
