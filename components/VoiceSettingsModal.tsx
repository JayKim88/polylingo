import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform as RNPlatform,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { X, RotateCcw, TestTube, Save } from 'lucide-react-native';
import { StorageService, VoiceSettings } from '../utils/storage';
import { SpeechService } from '../utils/speechService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

type VoiceSettingsModalProps = {
  visible: boolean;
  onClose: () => void;
};

export default function VoiceSettingsModal({
  visible,
  onClose,
}: VoiceSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [settings, setSettings] = useState<VoiceSettings>({
    volume: 0.9,
    rate: 0.8,
    pitch: 1.0,
  });

  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    const voiceSettings = await StorageService.getVoiceSettings();
    setSettings(voiceSettings);
  };

  const handleReset = () => {
    const defaultSettings = {
      volume: RNPlatform.OS === 'ios' ? settings.volume : 1.0, // iOS에서는 기존 볼륨 유지
      rate: 1.0,
      pitch: 1.0,
    };
    setSettings(defaultSettings);
  };

  const handleTest = async () => {
    if (!SpeechService.isAvailable()) {
      Alert.alert(t('alert.info'), t('voice.notSupported'));
      return;
    }

    try {
      setIsTesting(true);
      console.log('🧪 Testing with settings:', settings);

      // Show platform-specific info about volume
      if (RNPlatform.OS === 'ios') {
        console.log(
          '📱 iOS: Volume may be controlled by system volume settings'
        );
      }

      await SpeechService.speak(t('voice.testText'), 'en', settings);
    } catch (error) {
      console.error('🔊 TTS Test Error:', error);
      Alert.alert(t('alert.error'), t('voice.testError'));
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await StorageService.saveVoiceSettings(settings);
      onClose();
    } catch (error) {
      Alert.alert(t('alert.error'), t('voice.saveError'));
    }
  };

  const getVolumeText = (value: number) => {
    if (value >= 0.8) return t('voice.high');
    if (value >= 0.5) return t('voice.medium');
    return t('voice.low');
  };

  const getRateText = (value: number) => {
    if (value >= 1.2) return t('voice.fast');
    if (value >= 0.6) return t('voice.normal');
    return t('voice.slow');
  };

  const getPitchText = (value: number) => {
    if (value >= 1.3) return t('voice.high');
    if (value >= 0.8) return t('voice.normal');
    return t('voice.low');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1" style={{ backgroundColor: colors.background }}>
        <KeyboardAvoidingView
          className="flex-1"
          style={{ backgroundColor: colors.background }}
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View className="flex-row justify-between items-center px-5 pt-5 pb-4 border-b" style={{ borderBottomColor: colors.borderLight }}>
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {t('voice.title')}
            </Text>
            <TouchableOpacity onPress={onClose} className="p-2">
              <X size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 24,
              paddingBottom: 20,
            }}
            showsVerticalScrollIndicator={false}
          >
            {RNPlatform.OS !== 'ios' && (
              <View className="mb-8">
                <View className="flex-row justify-between items-center mb-4">
                  <Text className="text-base font-semibold" style={{ color: colors.text }}>
                    {t('voice.volume')}
                  </Text>
                  <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                    {getVolumeText(settings.volume)} (
                    {Math.round(settings.volume * 100)}%)
                  </Text>
                </View>
                <Slider
                  style={{ width: '100%', height: 40 }}
                  minimumValue={0.1}
                  maximumValue={1.0}
                  value={settings.volume}
                  onValueChange={(value) =>
                    setSettings({ ...settings, volume: value })
                  }
                  minimumTrackTintColor="#6366F1"
                  maximumTrackTintColor="#E5E7EB"
                />
                <View className="flex-row justify-between mt-2">
                  <Text className="text-xs" style={{ color: colors.textTertiary }}>조용함</Text>
                  <Text className="text-xs" style={{ color: colors.textTertiary }}>큼</Text>
                </View>
              </View>
            )}

            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-base font-semibold" style={{ color: colors.text }}>
                  {t('voice.speed')}
                </Text>
                <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                  {getRateText(settings.rate)} ({settings.rate.toFixed(1)}x)
                </Text>
              </View>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0.1}
                maximumValue={1.5}
                value={settings.rate}
                onValueChange={(value) =>
                  setSettings({ ...settings, rate: value })
                }
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.borderLight}
              />
              <View className="flex-row justify-between mt-2">
                <Text className="text-xs" style={{ color: colors.textTertiary }}>{t('voice.slow')}</Text>
                <Text className="text-xs" style={{ color: colors.textTertiary }}>{t('voice.fast')}</Text>
              </View>
            </View>

            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-base font-semibold" style={{ color: colors.text }}>
                  {t('voice.pitch')}
                </Text>
                <Text className="text-sm font-medium" style={{ color: colors.primary }}>
                  {getPitchText(settings.pitch)} ({settings.pitch.toFixed(1)})
                </Text>
              </View>
              <Slider
                style={{ width: '100%', height: 40 }}
                minimumValue={0.5}
                maximumValue={1.5}
                value={settings.pitch}
                onValueChange={(value) =>
                  setSettings({ ...settings, pitch: value })
                }
                minimumTrackTintColor={colors.primary}
                maximumTrackTintColor={colors.borderLight}
              />
              <View className="flex-row justify-between mt-2">
                <Text className="text-xs" style={{ color: colors.textTertiary }}>{t('voice.low')}</Text>
                <Text className="text-xs" style={{ color: colors.textTertiary }}>{t('voice.high')}</Text>
              </View>
            </View>
          </ScrollView>
          <View
            className="flex-row px-5 py-6 border-t gap-3"
            style={{ 
              borderTopColor: colors.borderLight, 
              backgroundColor: colors.surface,
              paddingBottom: Math.max(insets.bottom, 20) + 14 
            }}
          >
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl gap-2 border"
              style={{ backgroundColor: colors.background, borderColor: colors.border }}
              onPress={handleReset}
            >
              <RotateCcw size={18} color={colors.textSecondary} />
              <Text className="text-sm font-semibold" style={{ color: colors.textSecondary }}>
                {t('voice.reset')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl gap-2 border"
              style={{ backgroundColor: colors.warningContainer, borderColor: colors.warning }}
              onPress={handleTest}
              disabled={isTesting}
            >
              <TestTube size={18} color={colors.warning} />
              <Text className="text-sm font-semibold" style={{ color: colors.warning }}>
                {isTesting ? t('voice.inTesting') : t('voice.test')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3 px-4 rounded-xl gap-2"
              style={{ backgroundColor: colors.primary }}
              onPress={handleSave}
            >
              <Save size={18} color="#FFFFFF" />
              <Text className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                {t('voice.save')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
