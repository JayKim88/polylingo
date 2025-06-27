import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
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

interface VoiceSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

// const { width } = Dimensions.get('window'); // Unused for now

export default function VoiceSettingsModal({
  visible,
  onClose,
}: VoiceSettingsModalProps) {
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<VoiceSettings>({
    volume: 1.0,
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
      Alert.alert('알림', '이 기기에서는 음성 기능을 지원하지 않습니다.');
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

      await SpeechService.speak(
        '안녕하세요. 음성 설정을 테스트합니다.',
        'ko',
        settings
      );
    } catch (error) {
      console.error('🔊 TTS Test Error:', error);
      Alert.alert('오류', '음성 테스트 중 오류가 발생했습니다.');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    try {
      await StorageService.saveVoiceSettings(settings);
      onClose();
    } catch (error) {
      Alert.alert('오류', '설정 저장 중 오류가 발생했습니다.');
    }
  };

  const getVolumeText = (value: number) => {
    if (value >= 0.8) return '높음';
    if (value >= 0.5) return '중간';
    return '낮음';
  };

  const getRateText = (value: number) => {
    if (value >= 1.2) return '빠름';
    if (value >= 0.6) return '보통';
    return '느림';
  };

  const getPitchText = (value: number) => {
    if (value >= 1.3) return '높음';
    if (value >= 0.8) return '보통';
    return '낮음';
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={RNPlatform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.header}>
            <Text style={styles.title}>음성 설정</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {RNPlatform.OS !== 'ios' && (
              <View style={styles.settingSection}>
                <View style={styles.settingHeader}>
                  <Text style={styles.settingLabel}>음량</Text>
                  <Text style={styles.settingValue}>
                    {getVolumeText(settings.volume)} (
                    {Math.round(settings.volume * 100)}%)
                  </Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0.1}
                  maximumValue={1.0}
                  value={settings.volume}
                  onValueChange={(value) =>
                    setSettings({ ...settings, volume: value })
                  }
                  minimumTrackTintColor="#6366F1"
                  maximumTrackTintColor="#E5E7EB"
                />
                <View style={styles.sliderLabels}>
                  <Text style={styles.sliderLabelText}>조용함</Text>
                  <Text style={styles.sliderLabelText}>큼</Text>
                </View>
              </View>
            )}

            <View style={styles.settingSection}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingLabel}>속도</Text>
                <Text style={styles.settingValue}>
                  {getRateText(settings.rate)} ({settings.rate.toFixed(1)}x)
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.1}
                maximumValue={2.0}
                value={settings.rate}
                onValueChange={(value) =>
                  setSettings({ ...settings, rate: value })
                }
                minimumTrackTintColor="#6366F1"
                maximumTrackTintColor="#E5E7EB"
                // thumbStyle={styles.sliderThumb}
                // trackStyle={styles.sliderTrack}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>느림</Text>
                <Text style={styles.sliderLabelText}>빠름</Text>
              </View>
            </View>

            <View style={styles.settingSection}>
              <View style={styles.settingHeader}>
                <Text style={styles.settingLabel}>음조</Text>
                <Text style={styles.settingValue}>
                  {getPitchText(settings.pitch)} ({settings.pitch.toFixed(1)})
                </Text>
              </View>
              <Slider
                style={styles.slider}
                minimumValue={0.5}
                maximumValue={2.0}
                value={settings.pitch}
                onValueChange={(value) =>
                  setSettings({ ...settings, pitch: value })
                }
                minimumTrackTintColor="#6366F1"
                maximumTrackTintColor="#E5E7EB"
                // thumbStyle={styles.sliderThumb}
                // trackStyle={styles.sliderTrack}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>낮음</Text>
                <Text style={styles.sliderLabelText}>높음</Text>
              </View>
            </View>
          </ScrollView>
          <View
            style={[
              styles.actions,
              { paddingBottom: Math.max(insets.bottom, 20) + 14 },
            ]}
          >
            <TouchableOpacity
              style={[styles.actionButton, styles.resetButton]}
              onPress={handleReset}
            >
              <RotateCcw size={18} color="#6B7280" />
              <Text style={styles.resetButtonText}>기본값</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.testButton]}
              onPress={handleTest}
              disabled={isTesting}
            >
              <TestTube size={18} color="#F59E0B" />
              <Text style={styles.testButtonText}>
                {isTesting ? '테스트 중...' : '테스트'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={handleSave}
            >
              <Save size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>저장</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#111827',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
  },
  settingSection: {
    marginBottom: 32,
  },
  settingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#374151',
  },
  settingValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6366F1',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderThumb: {
    backgroundColor: '#6366F1',
    width: 24,
    height: 24,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabelText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#F59E0B',
    marginTop: 8,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  resetButton: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resetButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  testButton: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  testButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F59E0B',
  },
  saveButton: {
    backgroundColor: '#6366F1',
  },
  saveButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});
