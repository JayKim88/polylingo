import { Tabs } from 'expo-router';
import { Search, Heart, Clock, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

export const globalTabBarAnim = new Animated.Value(1);

export const ANIMATION_DURATION = 300;
const TAB_BAR_ICON_SIZE = 30;

export const hideTabBar = () => {
  Animated.timing(globalTabBarAnim, {
    toValue: 0,
    duration: ANIMATION_DURATION,
    useNativeDriver: true,
  }).start();
};

export const showTabBar = () => {
  Animated.timing(globalTabBarAnim, {
    toValue: 1,
    duration: ANIMATION_DURATION,
    useNativeDriver: true,
  }).start();
};

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const verticalSlideAnim = useRef(new Animated.Value(100)).current;
  const topSafeareaSlideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.timing(topSafeareaSlideAnim, {
        toValue: 1,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start(() => {
        Animated.parallel([
          Animated.timing(verticalSlideAnim, {
            toValue: 0,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }, 100);
  }, [verticalSlideAnim, fadeAnim, topSafeareaSlideAnim]);

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
    transform: [
      { translateY: verticalSlideAnim },
      {
        translateY: globalTabBarAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
        }),
      },
    ],
    opacity: fadeAnim,
  };

  return (
    <>
      {/* Background for the entire screen */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: colors.background,
          zIndex: -1,
        }}
      />

      <Animated.View
        style={{
          flex: 0,
          backgroundColor: colors.header,
          transform: [
            {
              translateY: topSafeareaSlideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-100, 0],
              }),
            },
          ],
        }}
      >
        <SafeAreaView
          style={{
            flex: 0,
            backgroundColor: 'transparent',
          }}
          edges={['top']}
        />
      </Animated.View>
      <SafeAreaView
        className="flex-1 bg-transparent"
        style={{ flex: 1, backgroundColor: colors.background }}
        edges={['left', 'right', 'bottom']}
      >
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: false,
            tabBarIconStyle: {
              height: '100%',
              justifyContent: 'center',
              alignItems: 'center',
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textTertiary,
            tabBarStyle: {
              ...tabBarStyle,
              ...animatedTabBarStyle,
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: t('tabs.search'),
              tabBarIcon: ({ color }) => (
                <Search size={TAB_BAR_ICON_SIZE} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="favorites"
            options={{
              title: t('tabs.favorites'),
              tabBarIcon: ({ color }) => (
                <Heart size={TAB_BAR_ICON_SIZE} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="history"
            options={{
              title: t('tabs.history'),
              tabBarIcon: ({ color }) => (
                <Clock size={TAB_BAR_ICON_SIZE} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              title: t('tabs.settings'),
              tabBarIcon: ({ color }) => (
                <Settings size={TAB_BAR_ICON_SIZE} color={color} />
              ),
            }}
          />
        </Tabs>
      </SafeAreaView>
    </>
  );
}
