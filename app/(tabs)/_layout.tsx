import { Tabs } from 'expo-router';
import { Search, Heart, Clock, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { colors } = useTheme();

  useEffect(() => {
    // Delay tab bar animation slightly to let page content load first
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, 100);
  }, [slideAnim, fadeAnim]);

  const tabBarStyle = {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    borderRadius: 30,
    margin: 16,
  };

  const animatedTabBarStyle = {
    ...tabBarStyle,
    transform: [{ translateY: slideAnim }],
    opacity: fadeAnim,
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background }}
      edges={['top', 'left', 'right', 'bottom']}
    >
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textTertiary,
          tabBarStyle: {
            ...animatedTabBarStyle,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontFamily: 'Inter-SemiBold',
            marginTop: 4,
          },
          lazy: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.search'),
            lazy: false, // disabl
            tabBarIcon: ({ size, color }) => (
              <Search size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: t('tabs.favorites'),
            lazy: false, // disabl
            tabBarIcon: ({ size, color }) => (
              <Heart size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: t('tabs.history'),
            lazy: false, // disabl
            tabBarIcon: ({ size, color }) => (
              <Clock size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: t('tabs.settings'),
            lazy: false, // disabl
            tabBarIcon: ({ size, color }) => (
              <Settings size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaView>
  );
}
