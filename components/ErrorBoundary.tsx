import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
import i18n from '../i18n';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error Boundary caught an error:', error, errorInfo);
    
    // Sentry에 에러 전송 (개인정보 없는 에러 정보만)
    Sentry.withScope((scope) => {
      scope.setTag('errorBoundary', true);
      scope.setContext('errorInfo', {
        componentStack: errorInfo.componentStack?.substring(0, 500), // 스택 일부만
      });
      Sentry.captureException(error);
    });
  }

  handleRestart = async () => {
    try {
      // 상태 리셋으로 에러 화면에서 복구 시도
      this.setState({ hasError: false, error: undefined });
    } catch (error) {
      console.error('Failed to reset error state:', error);
      Alert.alert(
        i18n.t('alert.error'), 
        i18n.t('errorBoundary.message')
      );
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View className="flex-1 justify-center items-center p-6 bg-white">
          <Text className="text-xl font-bold text-gray-800 mb-4 text-center">
            {i18n.t('errorBoundary.title')}
          </Text>
          <Text className="text-gray-600 mb-8 text-center leading-6">
            {i18n.t('errorBoundary.message')}
          </Text>
          <TouchableOpacity
            className="bg-blue-500 px-8 py-3 rounded-xl"
            onPress={this.handleRestart}
          >
            <Text className="text-white font-semibold text-lg">
              {i18n.t('errorBoundary.retry')}
            </Text>
          </TouchableOpacity>
          {__DEV__ && (
            <Text className="text-xs text-gray-400 mt-4 text-center">
              {i18n.t('errorBoundary.devMode')} {this.state.error?.message}
            </Text>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;