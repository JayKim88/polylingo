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
import { IAPService } from '../utils/iapService';
import { SubscriptionService } from '../utils/subscriptionService';
import { SUBSCRIPTION_PLANS, UserSubscription } from '../types/subscription';

type ExtendedSubscription = Subscription & {
  localizedPrice?: string;
};

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
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();

  const [products, setProducts] = useState<Subscription[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState<string | null>(null);
  const [iapAvailable, setIapAvailable] = useState(false);

  const getFormattedEndDate = () => {
    const endDate = currentSubscription?.endDate;
    if (endDate) {
      const date = new Date(endDate);
      if (i18n.language === 'en') {
        return t('favorites.dateSubtitle', {
          month: date.getMonth() + 1,
          day: date.getDate(),
          year: date.getFullYear(),
        });
      } else {
        return t('favorites.dateSubtitle', {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
        });
      }
    }
    return t('favorites.allFavorites');
  };

  useEffect(() => {
    if (!visible) return;
    loadSubscriptionData();
  }, [visible]);

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

  const updateSubscriptionStatus = async () => {
    await loadSubscriptionData();
    onSubscriptionChange?.();
  };

  const handlePurchase = async (productId: string, planId: string) => {
    setPurchaseLoading(planId);

    // if (__DEV__) {
    //   // Development mode - direct subscription setting
    //   await SubscriptionService.setSubscriptionWithLanguageReset(planId, true);
    //   await updateSubscriptionStatus();

    //   // Show success message
    //   const planName = getPlanDisplayName(planId);
    //   Alert.alert(
    //     t('subscription.subscriptionSuccess'),
    //     t('subscription.subscriptionSuccessMessage', { planName }),
    //     [
    //       {
    //         text: t('alert.confirm'),
    //         onPress: () => onClose(),
    //       },
    //     ]
    //   );
    //   return;
    // }

    const isLoggedIn = IAPService.getAppleIDLoginState();

    try {
      if (!isLoggedIn) {
        Alert.alert(
          t('subscription.loginRequired'),
          t('subscription.appleIDRequiredMessage'),
          [
            { text: t('alert.cancel'), style: 'cancel' },
            {
              text: t('subscription.loginAndTryAgain'),
              onPress: async () => {
                try {
                  await IAPService.authenticateWithAppleID();
                  setTimeout(() => handlePurchase(productId, planId), 100);
                } catch (error) {
                  console.error('Apple ID login failed:', error);
                }
              },
            },
          ]
        );
        setPurchaseLoading(null);
        return;
      }

      const currentSub = await SubscriptionService.getCurrentSubscription();

      if (currentSub && currentSub?.isActive) {
        const shouldProceed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('subscription.changeSubscription'),
            t('subscription.changeSubscriptionMessage', {
              currentPlan: getPlanDisplayName(currentSub.planId),
              newPlan: getPlanDisplayName(planId),
            }),
            [
              {
                text: t('alert.cancel'),
                style: 'cancel',
                onPress: () => resolve(false),
              },
              { text: t('subscription.change'), onPress: () => resolve(true) },
            ]
          );
        });

        if (!shouldProceed) {
          setPurchaseLoading(null);
          return; // 사용자가 취소한 경우
        }
      }

      const success = await IAPService.purchaseSubscription(productId);
      if (!success) throw new Error('Purchase failed');

      await SubscriptionService.setSubscriptionWithLanguageReset(planId, true);

      await updateSubscriptionStatus();

      const planName = getPlanDisplayName(planId);
      Alert.alert(
        t('subscription.subscriptionSuccess'),
        t('subscription.subscriptionSuccessMessage', { planName }),
        [{ text: t('alert.confirm'), onPress: () => onClose() }]
      );
    } catch (error: any) {
      const userCancelled =
        error?.code === 'E_USER_CANCELLED' ||
        error?.message?.includes('cancel') ||
        error?.message?.includes('Cancel') ||
        error?.userCancelled === true;

      if (userCancelled) {
        console.log('User cancelled purchase');
        return;
      }

      const loginRequired =
        error?.message?.includes('login') ||
        error?.message?.includes('Apple ID') ||
        error?.message?.includes('authentication');

      if (loginRequired) {
        Alert.alert(
          t('subscription.loginRequired'),
          t('subscription.loginRequiredMessage'),
          [
            { text: t('alert.cancel'), style: 'cancel' },
            {
              text: t('subscription.tryAgain'),
              onPress: () => handlePurchase(productId, planId),
            },
          ]
        );
      } else {
        Alert.alert(
          t('alert.error'),
          error?.message || t('subscription.purchaseError')
        );
      }
    } finally {
      setPurchaseLoading(null);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const success = await IAPService.restorePurchases();
      if (success) {
        await updateSubscriptionStatus();

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
    } catch (error: any) {
      console.error('Restore failed:', error);

      const userCancelLogin =
        error?.code === 'E_USER_CANCELLED' ||
        error?.message?.includes('cancel');

      if (userCancelLogin) {
        Alert.alert(
          t('subscription.loginRequired'),
          t('subscription.restoreLoginRequiredMessage'),
          [
            { text: t('alert.cancel'), style: 'cancel' },
            {
              text: t('subscription.tryAgain'),
              onPress: () => handleRestore(),
            },
          ]
        );
      } else {
        Alert.alert(
          t('subscription.restoreError'),
          error?.message || t('subscription.restoreErrorMessage')
        );
      }
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
    const isOnSubscription =
      !isFreePlan && currentSubscription?.planId !== 'free';

    // Map plan ID to product ID
    const productIdMap: { [key: string]: string } = {
      pro_monthly: 'com.polylingo.pro.monthly',
      pro_max_monthly: 'com.polylingo.promax.monthly',
      premium_yearly: 'com.polylingo.premium.yearly',
    };

    const product = products.find((p) => p.productId === productIdMap[plan.id]);

    const typedProduct: ExtendedSubscription | undefined = product;

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
              {isFreePlan
                ? `${
                    (products[1] as ExtendedSubscription).localizedPrice?.[0]
                  }0`
                : typedProduct?.localizedPrice ?? ''}
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
              {`${t('subscription.currentPlan')} ${
                isFreePlan
                  ? ''
                  : `- ${t('subscription.expiryDate')} ${getFormattedEndDate()}`
              }`}
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
                {t(
                  isOnSubscription
                    ? 'subscription.choose'
                    : 'subscription.upgrade'
                )}
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
            <View className="py-2">
              {SUBSCRIPTION_PLANS.map(renderPlanCard)}
            </View>

            {/* Restore Button */}
            <View className="mb-10">
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
