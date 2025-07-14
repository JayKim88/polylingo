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
import { useTheme } from '../contexts/ThemeContext';
import { IAPService } from '../utils/iapService';
import { SubscriptionService } from '../utils/subscriptionService';
import { SUBSCRIPTION_PLANS, UserSubscription } from '../types/subscription';
import { Subscription } from 'react-native-iap';

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
  const [products, setProducts] = useState<Subscription[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [iapAvailable, setIapAvailable] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSubscriptionData();
    }
  }, [visible]);

  const loadSubscriptionData = async () => {
    setLoading(true);
    try {
      // Check if IAP is available
      setIapAvailable(IAPService.isIAPAvailable());
      
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
      const success = await IAPService.purchaseSubscription(productId);
      if (success) {
        await loadSubscriptionData();
        onSubscriptionChange?.();
      }
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
        onSubscriptionChange?.();
      }
    } catch (error) {
      console.error('Restore failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProductPrice = (productId: string): string => {
    const product = products.find((p) => p.productId === productId);

    return (product as any)?.priceString || (product as any)?.price || '$0.00';
  };

  const renderPlanCard = (plan: any) => {
    const isCurrentPlan = currentSubscription?.planId === plan.id;
    const isFreePlan = plan.id === 'free';

    // Map plan ID to product ID
    const productIdMap: { [key: string]: string } = {
      pro_monthly: 'com.polyglottranslator.pro.monthly',
      pro_max_monthly: 'com.polyglottranslator.promax.monthly',
      premium_yearly: 'com.polyglottranslator.premium.yearly',
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
              {t(
                `subscription.${
                  plan.id === 'free' ? 'free' : plan.id.split('_')[0]
                }`
              )}
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
          <View
            className="py-3 px-4 rounded-xl border"
            style={{ borderColor: colors.border }}
          >
            <Text
              className="text-center font-medium"
              style={{ color: colors.textSecondary }}
            >
              {t('subscription.free')}
            </Text>
          </View>
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
              Subscription features are not available in this environment. This is normal when running in a simulator or development build.
            </Text>
            <Text
              className="text-sm text-center"
              style={{ color: colors.textSecondary }}
            >
              You currently have access to the Free plan with all basic features.
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
