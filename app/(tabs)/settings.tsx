import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Settings, 
  Info, 
  MessageCircle, 
  Star, 
  Shield, 
  Globe,
  ChevronRight,
  Languages
} from 'lucide-react-native';

export default function SettingsTab() {
  const handleAbout = () => {
    Alert.alert(
      '다국어 사전 앱',
      '버전 1.0.0\n\n여러 언어를 동시에 학습하는 사람들을 위한 번역 사전 앱입니다.\n\n• 6개 언어 지원\n• 단어/문장 번역\n• 중의적 의미 표시\n• 드래그앤드롭 정렬\n• 달력 기반 히스토리',
      [{ text: '확인' }]
    );
  };

  const handleFeedback = () => {
    Alert.alert(
      '피드백',
      '앱에 대한 의견이나 개선사항이 있으시면 언제든 알려주세요!\n\n더 나은 다국어 학습 경험을 제공하겠습니다.',
      [{ text: '확인' }]
    );
  };

  const handleRate = () => {
    Alert.alert(
      '앱 평가',
      '앱이 도움이 되셨나요? 평가해주시면 더 나은 서비스를 제공하는데 큰 도움이 됩니다.',
      [
        { text: '나중에' },
        { text: '평가하기', onPress: () => {} }
      ]
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      '개인정보 보호',
      '본 앱은 사용자의 개인정보를 수집하지 않습니다.\n\n• 검색 기록은 기기에만 저장됩니다\n• 네트워크 연결은 번역을 위해서만 사용됩니다\n• 사용자 데이터를 외부로 전송하지 않습니다\n• 모든 데이터는 로컬에서 관리됩니다',
      [{ text: '확인' }]
    );
  };

  const handleLanguageSupport = () => {
    Alert.alert(
      '지원 언어',
      '현재 지원하는 언어:\n\n🇰🇷 한국어 (Korean)\n🇺🇸 영어 (English)\n🇯🇵 일본어 (Japanese)\n🇫🇷 프랑스어 (French)\n🇩🇪 독일어 (German)\n🇪🇸 스페인어 (Spanish)\n\n더 많은 언어 지원을 준비 중입니다!',
      [{ text: '확인' }]
    );
  };

  const handleFeatures = () => {
    Alert.alert(
      '주요 기능',
      '• 다국어 동시 번역\n• 단어/문장 검색 타입 선택\n• 중의적 의미 상세 표시\n• 드래그앤드롭으로 언어 순서 변경\n• 달력 기반 좋아요/히스토리 관리\n• 음성 재생 및 복사 기능\n• 오프라인 저장 기능',
      [{ text: '확인' }]
    );
  };

  const SettingItem = ({ 
    icon, 
    title, 
    subtitle, 
    onPress, 
    showChevron = true,
    iconColor = '#6B7280',
    backgroundColor = '#F3F4F6'
  }: {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showChevron?: boolean;
    iconColor?: string;
    backgroundColor?: string;
  }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingItemContent}>
        <View style={[styles.iconContainer, { backgroundColor }]}>
          {icon}
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {showChevron && <ChevronRight size={20} color="#9CA3AF" />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Settings size={32} color="#6B7280" />
          <Text style={styles.headerTitle}>설정</Text>
        </View>
        <Text style={styles.headerSubtitle}>앱 설정 및 정보를 확인하세요</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>앱 정보</Text>
          
          <SettingItem
            icon={<Info size={20} color="#6366F1" />}
            title="앱 정보"
            subtitle="버전 및 개발자 정보"
            onPress={handleAbout}
            iconColor="#6366F1"
            backgroundColor="#EEF2FF"
          />
          
          <SettingItem
            icon={<Languages size={20} color="#10B981" />}
            title="주요 기능"
            subtitle="앱의 핵심 기능 소개"
            onPress={handleFeatures}
            iconColor="#10B981"
            backgroundColor="#ECFDF5"
          />
          
          <SettingItem
            icon={<Globe size={20} color="#059669" />}
            title="지원 언어"
            subtitle="번역 가능한 언어 목록"
            onPress={handleLanguageSupport}
            iconColor="#059669"
            backgroundColor="#ECFDF5"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>사용자</Text>
          
          <SettingItem
            icon={<MessageCircle size={20} color="#F59E0B" />}
            title="피드백 보내기"
            subtitle="의견이나 개선사항 제안"
            onPress={handleFeedback}
            iconColor="#F59E0B"
            backgroundColor="#FFFBEB"
          />
          
          <SettingItem
            icon={<Star size={20} color="#EF4444" />}
            title="앱 평가하기"
            subtitle="앱스토어에서 평가해주세요"
            onPress={handleRate}
            iconColor="#EF4444"
            backgroundColor="#FEF2F2"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>개인정보</Text>
          
          <SettingItem
            icon={<Shield size={20} color="#8B5CF6" />}
            title="개인정보 보호정책"
            subtitle="데이터 처리 및 보안 정책"
            onPress={handlePrivacy}
            iconColor="#8B5CF6"
            backgroundColor="#F3E8FF"
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ for multilingual learners
          </Text>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginLeft: 12,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginLeft: 44,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#374151',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  settingItemContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#111827',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
});