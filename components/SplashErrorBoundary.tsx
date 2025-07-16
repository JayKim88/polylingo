import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

// Hook-based fallback component
function DefaultFallback({ onRetry, error }: { onRetry: () => void; error?: Error }) {
  const { colors } = useTheme();
  
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center',
      backgroundColor: colors.background,
      paddingHorizontal: 40,
    }}>
      <Text style={{ 
        fontSize: 32, 
        marginBottom: 20,
        textAlign: 'center',
      }}>
        🌍
      </Text>
      
      <Text style={{ 
        fontSize: 28, 
        fontWeight: 'bold',
        color: colors.text,
        textAlign: 'center',
        marginBottom: 16,
      }}>
        PolyLingo
      </Text>
      
      <Text style={{ 
        fontSize: 16, 
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 30,
      }}>
        Loading...
      </Text>
      
      {error && (
        <TouchableOpacity
          onPress={onRetry}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: colors.background, fontWeight: 'bold' }}>
            Retry
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default class SplashErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('SplashScreen Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return <DefaultFallback onRetry={this.handleRetry} error={this.state.error} />;
    }

    return this.props.children;
  }
}