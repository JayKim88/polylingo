import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Crown, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Subscription } from 'react-native-iap';

import { useTheme } from '../contexts/ThemeContext';
import { useSubscription } from '../hooks/useSubscription';
import { IAPService } from '../utils/iapService';
import { SubscriptionService } from '../utils/subscriptionService';
import { SUBSCRIPTION_PLANS, UserSubscription } from '../types/subscription';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscriptionChange?: () => void;
}

export default function SubscriptionModal({
  visible,
  onClose,
  onSubscriptionChange,
}: SubscriptionModalProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { subscription: globalSubscription, refreshSubscription } =
    useSubscription();

  const [products, setProducts] = useState<Subscription[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [iapAvailable, setIapAvailable] = useState(false);

  useEffect(() => {
    if (!visible) return;
    loadSubscriptionData();
    globalSubscription && setCurrentSubscription(globalSubscription);
  }, [visible, globalSubscription]);

  const loadSubscriptionData = async () => {
    setLoading(true);
    try {
      // Check if IAP is available
      if (__DEV__) {
        setIapAvailable(true);
      } else {
        setIapAvailable(IAPService.isIAPAvailable());
      }

      const [productsResult, subscriptionResult] = await Promise.all([
        IAPService.getSubscriptionProducts(),
        SubscriptionService.getCurrentSubscription(),
      ]);

      setProducts(productsResult);
      setCurrentSubscription(subscriptionResult);
    } catch (error) {
      console.error('Failed to load subscription data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (productId: string, planId: string) => {
    setPurchaseLoading(planId);

    try {
      if (__DEV__ || !iapAvailable) {
        // Development mode or IAP not available - use direct subscription setting
        await SubscriptionService.setSubscriptionWithLanguageReset(
          planId,
          true
        );
      } else {
        // Production mode - use actual IAP
        const success = await IAPService.purchaseSubscription(productId);
        if (!success) {
          throw new Error('Purchase failed');
        }
        // After successful purchase, reset language settings for the new plan
        await SubscriptionService.setSubscriptionWithLanguageReset(
          planId,
          true
        );
      }

      await loadSubscriptionData();
      onSubscriptionChange?.();

      // Show success message
      const planName = getPlanDisplayName(planId);
      Alert.alert(
        t('subscription.subscriptionSuccess'),
        t('subscription.subscriptionSuccessMessage', { planName }),
        [
          {
            text: t('alert.confirm'),
            onPress: () => onClose(),
          },
        ]
      );
    } catch (error) {
      console.error('Purchase failed:', error);
      Alert.alert(t('alert.error'), '구매 중 오류가 발생했습니다.');
    } finally {
      setPurchaseLoading(null);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const success = await IAPService.restorePurchases();
      if (success) {
        await loadSubscriptionData();
        refreshSubscription(); // Refresh global subscription state
        onSubscriptionChange?.();

        // Show success message
        Alert.alert(
          t('subscription.restoreSuccess'),
          t('subscription.restoreSuccessMessage'),
          [
            {
              text: t('alert.confirm'),
              onPress: () => onClose(),
            },
          ]
        );
      } else {
        Alert.alert(
          t('subscription.restoreError'),
          t('subscription.restoreErrorMessage')
        );
      }
    } catch (error) {
      console.error('Restore failed:', error);
      Alert.alert(
        t('subscription.restoreError'),
        t('subscription.restoreErrorMessage')
      );
    } finally {
      setLoading(false);
    }
  };

  const getProductPrice = (productId: string): string => {
    const product = products.find((p) => p.productId === productId);

    return (product as any)?.priceString || (product as any)?.price || '$0.00';
  };

  const getPlanDisplayName = (planId: string): string => {
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

  const renderPlanCard = (plan: any) => {
    const isCurrentPlan = currentSubscription?.planId === plan.id;
    const isFreePlan = plan.id === 'free';

    // Map plan ID to product ID
    const productIdMap: { [key: string]: string } = {
      pro_monthly: 'com.polylingo.pro.monthly',
      pro_max_monthly: 'com.polylingo.promax.monthly',
      premium_yearly: 'com.polylingo.premium.yearly',
    };

    const product = products.find((p) => p.productId === productIdMap[plan.id]);

    return (
      <View
        key={plan.id}
        className={`p-4 rounded-2xl mb-4 ${
          isCurrentPlan ? 'border-2' : 'border'
        }`}
        style={{
          backgroundColor: colors.background,
          borderColor: isCurrentPlan ? colors.primary : colors.border,
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            {!isFreePlan && (
              <Crown
                size={20}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
            )}
            <Text className="text-lg font-bold" style={{ color: colors.text }}>
              {getPlanDisplayName(plan.id)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {isFreePlan ? '$0' : getProductPrice(product?.productId || '')}
            </Text>
            {!isFreePlan && (
              <Text
                className="text-sm ml-1"
                style={{ color: colors.textSecondary }}
              >
                /{t(`subscription.${plan.period}`)}
              </Text>
            )}
          </View>
        </View>

        <View className="mb-4">
          {plan.features.map((feature: string, index: number) => (
            <View key={index} className="flex-row items-center mb-2">
              <Check
                size={16}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                className="text-sm flex-1"
                style={{ color: colors.textSecondary }}
              >
                {t(feature)}
              </Text>
            </View>
          ))}
        </View>

        {isCurrentPlan ? (
          <View
            className="py-3 px-4 rounded-xl"
            style={{ backgroundColor: colors.primary }}
          >
            <Text
              className="text-center font-medium"
              style={{ color: colors.background }}
            >
              {t('subscription.currentPlan')}
            </Text>
          </View>
        ) : isFreePlan ? (
          <TouchableOpacity
            className="py-3 px-4 rounded-xl border"
            style={{ borderColor: colors.border }}
            onPress={() => handlePurchase('', plan.id)}
            disabled={purchaseLoading === plan.id || !__DEV__}
          >
            {purchaseLoading === plan.id ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <Text
                className="text-center font-medium"
                style={{ color: colors.textSecondary }}
              >
                {__DEV__
                  ? t('subscription.switchToFree')
                  : t('subscription.free')}
              </Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            className="py-3 px-4 rounded-xl"
            style={{ backgroundColor: colors.primary }}
            onPress={() => handlePurchase(product?.productId || '', plan.id)}
            disabled={purchaseLoading === plan.id}
          >
            {purchaseLoading === plan.id ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Text
                className="text-center font-medium"
                style={{ color: colors.background }}
              >
                {t('subscription.upgrade')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
        }}
      >
        {/* Header */}
        <View
          className="flex-row items-center justify-between px-6 py-4"
          style={{ borderBottomWidth: 1, borderBottomColor: colors.border }}
        >
          <Text className="text-xl font-bold" style={{ color: colors.text }}>
            {t('subscription.title')}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !iapAvailable ? (
          <View className="flex-1 justify-center items-center px-6">
            <Text
              className="text-lg font-bold mb-4 text-center"
              style={{ color: colors.text }}
            >
              In-App Purchases Unavailable
            </Text>
            <Text
              className="text-center mb-6"
              style={{ color: colors.textSecondary }}
            >
              Subscription features are not available in this environment. This
              is normal when running in a simulator or development build.
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: colors.textSecondary }}
            >
              You currently have access to the Free plan with all basic
              features.
            </Text>
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
          >
            <View className="py-6">
              {SUBSCRIPTION_PLANS.map(renderPlanCard)}
            </View>

            {/* Restore Button */}
            <View className="pb-6">
              <TouchableOpacity
                className="py-4 px-6 rounded-xl border"
                style={{ borderColor: colors.border }}
                onPress={handleRestore}
              >
                <Text
                  className="text-center font-medium"
                  style={{ color: colors.text }}
                >
                  {t('subscription.restore')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}
