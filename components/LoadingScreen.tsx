import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import LogoMark from '@/components/LogoMark';
import { useTheme } from '@/contexts/ThemeContext';

export default function LoadingScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.container}>
      <View style={[styles.glowLarge, { backgroundColor: theme.primary + '18' }]} />
      <View style={[styles.glowSmall, { backgroundColor: theme.secondary + '16' }]} />

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}>
        <View style={[styles.logoWrap, { backgroundColor: theme.primary }]}>
          <LogoMark size={48} color="#FFFFFF" accent="#FFFFFF" />
        </View>

        <Text style={[styles.title, { color: theme.text }]}>GeoKZN</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Загружаем карту событий Казани
        </Text>

        <View style={styles.loaderRow}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.loaderText, { color: theme.textSecondary }]}>Подготавливаем приложение...</Text>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      overflow: 'hidden',
    },
    glowLarge: {
      position: 'absolute',
      width: 280,
      height: 280,
      borderRadius: 140,
      top: -40,
      right: -60,
    },
    glowSmall: {
      position: 'absolute',
      width: 220,
      height: 220,
      borderRadius: 110,
      bottom: -30,
      left: -50,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 28,
      paddingHorizontal: 24,
      paddingVertical: 28,
      borderWidth: 1,
      alignItems: 'center',
      elevation: 8,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
    },
    logoWrap: {
      width: 92,
      height: 92,
      borderRadius: 30,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 30,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    subtitle: {
      marginTop: 10,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 260,
    },
    loaderRow: {
      marginTop: 24,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    loaderText: {
      fontSize: 14,
      fontWeight: '600',
    },
  });
