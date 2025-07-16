import React, { useRef } from 'react';
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
import { X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';

type LegalDocumentModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  content: string;
};

export default function LegalDocumentModal({
  visible,
  onClose,
  title,
  content,
}: LegalDocumentModalProps) {
  const { colors } = useTheme();

  const closeButtonScale = useRef(new Animated.Value(1)).current;

  const animateButton = (scale: Animated.Value, value: number) => {
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  };

  const formatContent = (text: string) => {
    // Convert markdown-style headers to styled text
    const lines = text.split('\n');
    const formattedLines = lines.map((line, index) => {
      // Handle headers
      if (line.startsWith('# ')) {
        return (
          <Text
            key={index}
            className="text-2xl font-bold mb-4 mt-6"
            style={{ color: colors.text }}
          >
            {line.substring(2)}
          </Text>
        );
      }

      if (line.startsWith('## ')) {
        return (
          <Text
            key={index}
            className="text-xl font-bold mb-3 mt-5"
            style={{ color: colors.text }}
          >
            {line.substring(3)}
          </Text>
        );
      }

      if (line.startsWith('### ')) {
        return (
          <Text
            key={index}
            className="text-lg font-semibold mb-2 mt-4"
            style={{ color: colors.text }}
          >
            {line.substring(4)}
          </Text>
        );
      }

      // Handle bullet points
      if (line.startsWith('- ')) {
        return (
          <Text
            key={index}
            className="text-base mb-2 ml-4"
            style={{ color: colors.textSecondary }}
          >
            • {line.substring(2)}
          </Text>
        );
      }

      // Handle bold text
      if (line.startsWith('**') && line.endsWith('**')) {
        return (
          <Text
            key={index}
            className="text-base font-bold mb-2"
            style={{ color: colors.text }}
          >
            {line.substring(2, line.length - 2)}
          </Text>
        );
      }

      // Handle regular paragraphs
      if (line.trim() === '') {
        return <View key={index} className="mb-2" />;
      }

      // Handle inline bold text within paragraphs
      const renderTextWithBold = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*)/);
        
        return parts.map((part, partIndex) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <Text
                key={partIndex}
                className="font-bold"
                style={{ color: colors.text }}
              >
                {part.substring(2, part.length - 2)}
              </Text>
            );
          }
          return part;
        });
      };

      return (
        <Text
          key={index}
          className="text-base mb-2 leading-6"
          style={{ color: colors.textSecondary }}
        >
          {renderTextWithBold(line)}
        </Text>
      );
    });

    return formattedLines;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
          <View
            className="flex-row justify-between items-center px-6 py-4 border-b"
            style={{ borderBottomColor: colors.border }}
          >
            <Text className="text-xl font-bold" style={{ color: colors.text }}>
              {title}
            </Text>
            <Animated.View style={{ transform: [{ scale: closeButtonScale }] }}>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 rounded-full"
                style={{ backgroundColor: colors.surface }}
                onPressIn={() => animateButton(closeButtonScale, 0.95)}
                onPressOut={() => animateButton(closeButtonScale, 1)}
                activeOpacity={1}
              >
                <X size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1 px-6 py-4"
            showsVerticalScrollIndicator={false}
          >
            <View className="pb-6">{formatContent(content)}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
