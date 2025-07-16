import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { SubscriptionService } from '../utils/subscriptionService';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Circle } from 'react-native-svg';
import {
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Battery,
} from 'lucide-react-native';

interface CircularUsageButtonProps {
  onPress: () => void;
  size?: number;
  refreshTrigger?: number; // Add prop to trigger refresh
}

const BatteryIcon = React.memo(
  ({ usagePercentage, color }: { usagePercentage: number; color: string }) =>
    usagePercentage >= 100 ? (
      <Battery size={20} color={color} />
    ) : usagePercentage >= 95 ? (
      <BatteryLow size={20} color={color} />
    ) : usagePercentage >= 80 ? (
      <BatteryMedium size={20} color={color} />
    ) : (
      <BatteryFull size={20} color={color} />
    )
);

const CircularUsageButton = React.memo(
  ({ onPress, size = 44, refreshTrigger }: CircularUsageButtonProps) => {
    const { colors } = useTheme();
    const [usage, setUsage] = useState({ used: 0, limit: 100, remaining: 100 });

    const loadUsage = async () => {
      try {
        const usageData = await SubscriptionService.getDailyUsage();
        setUsage(usageData);
      } catch (error) {
        console.error('Error loading usage:', error);
      }
    };

    useFocusEffect(
      React.useCallback(() => {
        loadUsage();
      }, [])
    );

    // Update usage when refreshTrigger changes (immediate update on translation)
    useEffect(() => {
      if (refreshTrigger !== undefined) {
        loadUsage();
      }
    }, [refreshTrigger]);

    // Calculate progress percentage (0-100)
    const usagePercentage = (usage.used / usage.limit) * 100;

    // SVG circle properties
    const radius = (size - 8) / 2; // Account for stroke width
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    // For counter-clockwise from 12 o'clock, we use usagePercentage instead of remainingPercentage
    const strokeDashoffset = (usagePercentage / 100) * circumference;

    // Determine color based on usage
    const getProgressColor = () => {
      if (usagePercentage >= 100) return colors.border;
      if (usagePercentage >= 95) return '#EF4444'; // Red - danger
      if (usagePercentage >= 80) return '#F59E0B'; // Orange - warning
      return '#10B981'; // Green - safe
    };

    return (
      <TouchableOpacity
        onPress={onPress}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 2,
        }}
        activeOpacity={0.7}
      >
        <View style={{ position: 'absolute' }}>
          <Svg
            width={size}
            height={size}
            style={{ transform: [{ rotate: '-90deg' }] }}
          >
            {/* Background circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={colors.border}
              strokeWidth={3}
              fill="transparent"
            />
            {/* Progress circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getProgressColor()}
              strokeWidth={3}
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </Svg>
        </View>

        <BatteryIcon
          usagePercentage={usagePercentage}
          color={getProgressColor()}
        />
      </TouchableOpacity>
    );
  },
  (prevProps, nextProps) => {
    return prevProps.refreshTrigger === nextProps.refreshTrigger;
  }
);

export default CircularUsageButton;
