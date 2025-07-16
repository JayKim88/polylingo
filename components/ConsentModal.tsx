import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
  Animated,
} from 'react-native';
import { Shield, FileText, Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

type ConsentModalProps = {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
};

export default function ConsentModal({
  visible,
  onAccept,
  onDecline,
}: ConsentModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  
  const acceptButtonScale = useRef(new Animated.Value(1)).current;
  const declineButtonScale = useRef(new Animated.Value(1)).current;

  const animateButton = (scale: Animated.Value, value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const canAccept = hasReadTerms && hasReadPrivacy;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDecline}
    >
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: colors.background }}
      >
        <KeyboardAvoidingView
          className="flex-1"
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Header */}
          <View className="px-6 py-6">
            <View className="items-center mb-6">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: colors.primaryContainer }}
              >
                <Shield size={40} color={colors.primary} />
              </View>
              <Text
                className="text-2xl font-bold text-center mb-2"
                style={{ color: colors.text }}
              >
                {t('consent.title')}
              </Text>
              <Text
                className="text-base text-center opacity-80"
                style={{ color: colors.textSecondary }}
              >
                {t('consent.subtitle')}
              </Text>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
          >
            <View className="mb-6">
              <Text
                className="text-lg font-semibold mb-3"
                style={{ color: colors.text }}
              >
                {t('consent.welcomeTitle')}
              </Text>
              <Text
                className="text-base leading-6 mb-4"
                style={{ color: colors.textSecondary }}
              >
                {t('consent.welcomeMessage')}
              </Text>
            </View>

            <View className="mb-6">
              <Text
                className="text-lg font-semibold mb-3"
                style={{ color: colors.text }}
              >
                {t('consent.dataCollectionTitle')}
              </Text>
              <Text
                className="text-base leading-6 mb-4"
                style={{ color: colors.textSecondary }}
              >
                {t('consent.dataCollectionMessage')}
              </Text>
              
              <View className="mb-3">
                <Text
                  className="text-base font-medium mb-2"
                  style={{ color: colors.text }}
                >
                  {t('consent.dataWeCollect')}
                </Text>
                <Text
                  className="text-sm leading-5 ml-4"
                  style={{ color: colors.textSecondary }}
                >
                  • {t('consent.translationText')}{'\n'}
                  • {t('consent.languagePreferences')}{'\n'}
                  • {t('consent.usageStatistics')}{'\n'}
                  • {t('consent.crashReports')}
                </Text>
              </View>
              
              <View className="mb-4">
                <Text
                  className="text-base font-medium mb-2"
                  style={{ color: colors.text }}
                >
                  {t('consent.dataWeDontCollect')}
                </Text>
                <Text
                  className="text-sm leading-5 ml-4"
                  style={{ color: colors.textSecondary }}
                >
                  • {t('consent.personalIdentity')}{'\n'}
                  • {t('consent.locationData')}{'\n'}
                  • {t('consent.contactInfo')}
                </Text>
              </View>
            </View>

            {/* Agreement Checkboxes */}
            <View className="mb-6">
              <Text
                className="text-lg font-semibold mb-4"
                style={{ color: colors.text }}
              >
                {t('consent.agreementTitle')}
              </Text>
              
              <TouchableOpacity
                className="flex-row items-center p-4 rounded-xl mb-3 border"
                style={{
                  backgroundColor: hasReadTerms ? colors.primaryContainer : colors.surface,
                  borderColor: hasReadTerms ? colors.primary : colors.border,
                }}
                onPress={() => setHasReadTerms(!hasReadTerms)}
              >
                <View
                  className="w-6 h-6 rounded-md items-center justify-center mr-3 border"
                  style={{
                    backgroundColor: hasReadTerms ? colors.primary : 'transparent',
                    borderColor: hasReadTerms ? colors.primary : colors.border,
                  }}
                >
                  {hasReadTerms && <Check size={16} color="#FFFFFF" />}
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-medium"
                    style={{ color: colors.text }}
                  >
                    {t('consent.termsAgreement')}
                  </Text>
                  <Text
                    className="text-sm mt-1"
                    style={{ color: colors.textSecondary }}
                  >
                    {t('consent.termsDescription')}
                  </Text>
                </View>
                <FileText size={20} color={colors.textSecondary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                className="flex-row items-center p-4 rounded-xl mb-4 border"
                style={{
                  backgroundColor: hasReadPrivacy ? colors.primaryContainer : colors.surface,
                  borderColor: hasReadPrivacy ? colors.primary : colors.border,
                }}
                onPress={() => setHasReadPrivacy(!hasReadPrivacy)}
              >
                <View
                  className="w-6 h-6 rounded-md items-center justify-center mr-3 border"
                  style={{
                    backgroundColor: hasReadPrivacy ? colors.primary : 'transparent',
                    borderColor: hasReadPrivacy ? colors.primary : colors.border,
                  }}
                >
                  {hasReadPrivacy && <Check size={16} color="#FFFFFF" />}
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base font-medium"
                    style={{ color: colors.text }}
                  >
                    {t('consent.privacyAgreement')}
                  </Text>
                  <Text
                    className="text-sm mt-1"
                    style={{ color: colors.textSecondary }}
                  >
                    {t('consent.privacyDescription')}
                  </Text>
                </View>
                <Shield size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View className="mb-6">
              <Text
                className="text-base leading-6 text-center"
                style={{ color: colors.textSecondary }}
              >
                {t('consent.finalMessage')}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Buttons */}
          <View className="px-6 py-4 border-t" style={{ borderTopColor: colors.border }}>
            <View className="flex-row gap-3">
              <Animated.View
                style={{ transform: [{ scale: declineButtonScale }], flex: 1 }}
              >
                <TouchableOpacity
                  className="py-4 px-6 rounded-xl items-center border"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  }}
                  onPress={onDecline}
                  onPressIn={() => animateButton(declineButtonScale, 0.95)}
                  onPressOut={() => animateButton(declineButtonScale, 1)}
                  activeOpacity={1}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: colors.textSecondary }}
                  >
                    {t('consent.decline')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
              
              <Animated.View
                style={{ transform: [{ scale: acceptButtonScale }], flex: 1 }}
              >
                <TouchableOpacity
                  className="py-4 px-6 rounded-xl items-center"
                  style={{
                    backgroundColor: canAccept ? colors.primary : colors.textTertiary,
                    opacity: canAccept ? 1 : 0.6,
                  }}
                  onPress={onAccept}
                  disabled={!canAccept}
                  onPressIn={() => canAccept && animateButton(acceptButtonScale, 0.95)}
                  onPressOut={() => animateButton(acceptButtonScale, 1)}
                  activeOpacity={1}
                >
                  <Text
                    className="text-base font-semibold"
                    style={{ color: '#FFFFFF' }}
                  >
                    {t('consent.accept')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
            
            <Text
              className="text-xs text-center mt-3 opacity-70"
              style={{ color: colors.textTertiary }}
            >
              {t('consent.footerMessage')}
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}