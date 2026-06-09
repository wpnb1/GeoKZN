import LogoMark from '@/components/LogoMark';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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
  serverUrl: string;
  defaultServerUrl: string;
  onSaveServerUrl: (url: string) => Promise<void>;
  onResetServerUrl: () => Promise<void>;
};

type FieldErrors = {
  username?: string;
  password?: string;
};

export default function LoginScreen({
  onLogin,
  onRegister,
  onGuest,
  serverUrl,
  defaultServerUrl,
  onSaveServerUrl,
  onResetServerUrl,
}: Props) {
  const { theme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverDraft, setServerDraft] = useState(serverUrl);
  const [serverMessage, setServerMessage] = useState('');

  const handleSubmit = async () => {
    setError('');

    const u = username.trim();
    const p = password;
    const nextErrors: FieldErrors = {};

    if (!u) {
      nextErrors.username = 'Введите логин.';
    } else if (isRegister && u.length < 3) {
      nextErrors.username = 'Логин должен содержать минимум 3 символа.';
    }

    if (!p) {
      nextErrors.password = 'Введите пароль.';
    } else if (p.length < 4) {
      nextErrors.password = 'Пароль должен содержать минимум 4 символа.';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (isRegister) {
        await onRegister(u, p);
      } else {
        await onLogin(u, p);
      }
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Ошибка авторизации.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveServerUrl = async () => {
    try {
      await onSaveServerUrl(serverDraft);
      setServerMessage('Адрес сервера сохранен.');
      setError('');
    } catch (e: any) {
      setServerMessage(e?.message ? String(e.message) : 'Не удалось сохранить адрес сервера.');
    }
  };

  const handleResetServerUrl = async () => {
    try {
      await onResetServerUrl();
      setServerDraft(defaultServerUrl);
      setServerMessage('Возвращен адрес по умолчанию.');
      setError('');
    } catch (e: any) {
      setServerMessage(e?.message ? String(e.message) : 'Не удалось вернуть адрес по умолчанию.');
    }
  };

  const styles = createStyles(theme);
  const isServerMessageSuccess =
    serverMessage.includes('сохран') || serverMessage.includes('Возвращ');

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
                  borderColor: fieldErrors.username ? theme.error : theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Введите логин"
              placeholderTextColor={theme.textDisabled}
              value={username}
              onChangeText={(next) => {
                setUsername(next);
                setFieldErrors((prev) => ({ ...prev, username: undefined }));
                setError('');
              }}
              editable={!submitting}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {fieldErrors.username ? (
              <Text style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.username}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Пароль</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceVariant,
                  borderColor: fieldErrors.password ? theme.error : theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Введите пароль"
              placeholderTextColor={theme.textDisabled}
              value={password}
              onChangeText={(next) => {
                setPassword(next);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
                setError('');
              }}
              secureTextEntry
              editable={!submitting}
            />
            {fieldErrors.password ? (
              <Text style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.password}</Text>
            ) : null}
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

          <View style={[styles.serverCard, { borderColor: theme.border, backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.serverLabel, { color: theme.textSecondary }]}>Сервер</Text>
            <Text style={[styles.serverValue, { color: theme.text }]} numberOfLines={2}>
              {serverUrl}
            </Text>

            <TouchableOpacity
              onPress={() => {
                setShowServerSettings((prev) => !prev);
                setServerDraft(serverUrl);
                setServerMessage('');
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.link, { color: theme.primary, marginTop: 10 }]}>
                {showServerSettings ? 'Скрыть настройки сервера' : 'Изменить адрес сервера'}
              </Text>
            </TouchableOpacity>

            {showServerSettings ? (
              <View style={styles.serverSettingsBox}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.surface,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  placeholder="http://192.168.0.10:4000"
                  placeholderTextColor={theme.textDisabled}
                  value={serverDraft}
                  onChangeText={(next) => {
                    setServerDraft(next);
                    setServerMessage('');
                  }}
                  editable={!submitting}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />

                <Text
                  style={[
                    styles.serverHint,
                    {
                      color: serverMessage
                        ? isServerMessageSuccess
                          ? theme.success
                          : theme.error
                        : theme.textSecondary,
                    },
                  ]}
                >
                  {serverMessage || 'Для APK укажите IP ноутбука или другого сервера с backend.'}
                </Text>

                <View style={styles.serverButtonsRow}>
                  <TouchableOpacity
                    style={[styles.serverButton, { backgroundColor: theme.primary }]}
                    onPress={handleSaveServerUrl}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.serverButtonText}>Сохранить</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.serverButton,
                      { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1.5 },
                    ]}
                    onPress={handleResetServerUrl}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.serverButtonText, { color: theme.text }]}>По умолчанию</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={() => {
              setIsRegister(!isRegister);
              setError('');
              setFieldErrors({});
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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingVertical: 24,
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
    fieldError: {
      fontSize: 13,
      marginTop: 8,
      fontWeight: '500',
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
    serverCard: {
      borderRadius: 14,
      borderWidth: 1.5,
      padding: 14,
      marginTop: 14,
    },
    serverLabel: {
      fontSize: 12,
      fontWeight: '700',
      marginBottom: 6,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    serverValue: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 20,
    },
    serverSettingsBox: {
      marginTop: 12,
    },
    serverHint: {
      fontSize: 12,
      fontWeight: '500',
      lineHeight: 18,
      marginTop: 8,
    },
    serverButtonsRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 12,
    },
    serverButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    serverButtonText: {
      color: '#FFFFFF',
      fontWeight: '700',
      fontSize: 14,
    },
    link: {
      textAlign: 'center',
      marginTop: 16,
      fontSize: 14,
      fontWeight: '500',
    },
  });
