import LogoMark from '@/components/LogoMark';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onGuest?: () => void;
};

export default function LoginScreen({ onLogin, onRegister, onGuest }: Props) {
  const { theme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError('');

    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setError('Пожалуйста, заполните все поля');
      return;
    }

    if (p.length < 4) {
      setError('Пароль должен содержать минимум 4 символа');
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await onRegister(u, p);
      } else {
        await onLogin(u, p);
      }
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Ошибка авторизации');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = createStyles(theme);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
            <LogoMark size={36} color="#FFFFFF" accent="#FFFFFF" />
          </View>
          <Text style={[styles.logo, { color: theme.primary }]}>GeoKZN</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Казань</Text>
        </View>

        <Text style={[styles.title, { color: theme.text }]}>
          {isRegister ? 'Регистрация' : 'Вход в систему'}
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Логин</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceVariant,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Введите логин"
            placeholderTextColor={theme.textDisabled}
            value={username}
            onChangeText={setUsername}
            editable={!submitting}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>Пароль</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.surfaceVariant,
                borderColor: theme.border,
                color: theme.text,
              },
            ]}
            placeholder="Введите пароль"
            placeholderTextColor={theme.textDisabled}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            editable={!submitting}
          />
        </View>

        {error ? (
          <View style={[styles.errorBox, { backgroundColor: theme.errorLight + '20' }]}>
            <Text style={[styles.error, { color: theme.error }]}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary, opacity: submitting ? 0.7 : 1 }]}
          onPress={handleSubmit}
          activeOpacity={0.8}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{isRegister ? 'Зарегистрироваться' : 'Войти'}</Text>
          )}
        </TouchableOpacity>

        {onGuest ? (
          <TouchableOpacity
            style={[styles.guestButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
            onPress={onGuest}
            activeOpacity={0.7}
            disabled={submitting}
          >
            <Text style={[styles.guestButtonText, { color: theme.text }]}>Войти как гость</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={() => {
            setIsRegister(!isRegister);
            setError('');
            setPassword('');
          }}
          activeOpacity={0.7}
          disabled={submitting}
        >
          <Text style={[styles.link, { color: theme.primary }]}> 
            {isRegister ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      borderRadius: 24,
      padding: 28,
      elevation: 8,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    logoCircle: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 12,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    logo: {
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: 0.5,
    },
    subtitle: {
      fontSize: 16,
      marginTop: 4,
      fontWeight: '500',
    },
    title: {
      fontSize: 22,
      textAlign: 'center',
      marginBottom: 24,
      fontWeight: '600',
    },
    field: {
      marginBottom: 16,
    },
    label: {
      fontSize: 14,
      marginBottom: 8,
      fontWeight: '500',
    },
    input: {
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
    },
    errorBox: {
      borderRadius: 10,
      padding: 12,
      marginBottom: 16,
    },
    error: {
      fontSize: 14,
      fontWeight: '500',
    },
    button: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    buttonText: {
      color: '#FFFFFF',
      fontWeight: '600',
      fontSize: 16,
    },
    guestButton: {
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
      borderWidth: 1.5,
    },
    guestButtonText: {
      fontWeight: '600',
      fontSize: 15,
    },
    link: {
      textAlign: 'center',
      marginTop: 16,
      fontSize: 14,
      fontWeight: '500',
    },
  });
