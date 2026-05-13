import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

import { useTheme } from "@/contexts/ThemeContext";
import { EventWithArchive, User } from "@/types/models";

type Props = {
  user: User;
  events: EventWithArchive[];
  onBack: () => void;
  onLogout: () => void;
  onUpdateProfile: (payload: { username?: string; avatarEmoji?: string | null }) => void;
  onChangePassword: (currentPassword: string, newPassword: string) => void;
};

const EMOJI_CHOICES = ["🙂", "😎", "🤝", "🚗", "🚦", "🛣️", "🧭", "⭐", "🔥", "✅", "⚠️", "❗", "🟣", "🔵", "🟢"];

export default function ProfileScreen({
  user,
  events,
  onBack,
  onLogout,
  onUpdateProfile,
  onChangePassword,
}: Props) {
  const { theme } = useTheme();
  const [editing, setEditing] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user.username);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(user.avatarEmoji ?? null);
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newPass2, setNewPass2] = useState("");

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);

  const daysInSystem = Math.ceil((Date.now() - user.registeredAt.getTime()) / (1000 * 60 * 60 * 24));

  const styles = createStyles(theme);
  const avatarLabel = useMemo(() => {
    const emoji = user.avatarEmoji?.trim();
    if (emoji) return emoji;
    return user.username[0]?.toUpperCase() || "U";
  }, [user.avatarEmoji, user.username]);

  const saveProfile = () => {
    const nextUsername = usernameDraft.trim();
    if (!nextUsername || nextUsername.length < 3) {
      Alert.alert("Некорректно", "Никнейм должен быть не короче 3 символов.");
      return;
    }
    onUpdateProfile({ username: nextUsername, avatarEmoji: avatarDraft });
    setEditing(false);
  };

  const submitPasswordChange = () => {
    if (!currentPass.trim() || !newPass.trim()) return;
    if (newPass.trim().length < 4) {
      Alert.alert("Некорректно", "Новый пароль должен быть минимум 4 символа.");
      return;
    }
    if (newPass !== newPass2) {
      Alert.alert("Некорректно", "Пароли не совпадают.");
      return;
    }
    onChangePassword(currentPass, newPass);
    setCurrentPass("");
    setNewPass("");
    setNewPass2("");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Назад</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onLogout} activeOpacity={0.7}>
          <Text style={[styles.logoutText, { color: theme.error }]}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{avatarLabel}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.usernameRow}>
                <Text style={[styles.username, { color: theme.text }]}>{user.username}</Text>
                {user.isAdmin && (
                  <View style={[styles.adminBadge, { backgroundColor: theme.secondary + "20", borderColor: theme.secondary }]}>
                    <Text style={[styles.adminBadgeText, { color: theme.secondary }]}>ADMIN</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>В системе: {daysInSystem} дн.</Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>Регистрация: {formatDate(user.registeredAt)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.editToggle, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
            onPress={() => {
              setEditing((v) => !v);
              setUsernameDraft(user.username);
              setAvatarDraft(user.avatarEmoji ?? null);
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.editToggleText, { color: theme.text }]}>
              {editing ? "Закрыть редактирование" : "Редактировать профиль"}
            </Text>
          </TouchableOpacity>

          {editing ? (
            <View style={styles.editBox}>
              <Text style={[styles.editLabel, { color: theme.textSecondary }]}>Никнейм</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.text }]}
                value={usernameDraft}
                onChangeText={setUsernameDraft}
                autoCapitalize="none"
              />

              <Text style={[styles.editLabel, { color: theme.textSecondary, marginTop: 12 }]}>Аватар (эмодзи)</Text>
              <View style={styles.emojiRow}>
                {EMOJI_CHOICES.map((e) => {
                  const active = avatarDraft === e;
                  return (
                    <TouchableOpacity
                      key={e}
                      style={[
                        styles.emojiBtn,
                        { backgroundColor: active ? theme.primary + "20" : theme.surfaceVariant, borderColor: active ? theme.primary : theme.border },
                      ]}
                      onPress={() => setAvatarDraft(e)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.emojiText}>{e}</Text>
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.emojiBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                  onPress={() => setAvatarDraft(null)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.emojiText, { color: theme.textSecondary }]}>×</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.editButtonsRow}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                  onPress={saveProfile}
                  activeOpacity={0.8}
                >
                  <Text style={styles.smallBtnText}>Сохранить</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}
                  onPress={() => setEditing(false)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.smallBtnText, { color: theme.text }]}>Отмена</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <Text style={[styles.editLabel, { color: theme.textSecondary }]}>Смена пароля</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.text }]}
                value={currentPass}
                onChangeText={setCurrentPass}
                placeholder="Текущий пароль"
                placeholderTextColor={theme.textDisabled}
                secureTextEntry
              />
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.text, marginTop: 10 }]}
                value={newPass}
                onChangeText={setNewPass}
                placeholder="Новый пароль"
                placeholderTextColor={theme.textDisabled}
                secureTextEntry
              />
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.text, marginTop: 10 }]}
                value={newPass2}
                onChangeText={setNewPass2}
                placeholder="Повтор нового пароля"
                placeholderTextColor={theme.textDisabled}
                secureTextEntry
              />
              <TouchableOpacity
                style={[styles.primaryMiniButton, { backgroundColor: theme.primary, opacity: currentPass.trim() && newPass.trim() ? 1 : 0.6 }]}
                onPress={submitPasswordChange}
                disabled={!currentPass.trim() || !newPass.trim()}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryMiniButtonText}>Сменить пароль</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Мои события ({events.length})</Text>
          {events.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Пока нет событий.</Text>
          ) : (
            events.map((e) => (
              <View key={e.id} style={[styles.item, { borderColor: theme.border }]}
              >
                <Text style={[styles.itemTitle, { color: theme.text }]}>{e.title}</Text>
                <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>{formatDateTime(e.createdAt)}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    backText: { fontSize: 16, fontWeight: "700" },
    logoutText: { fontSize: 16, fontWeight: "700" },
    content: { padding: 16, paddingBottom: 24 },
    card: {
      borderRadius: 20,
      padding: 18,
      elevation: 6,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      marginBottom: 16,
    },
    userRow: { flexDirection: "row", alignItems: "center", gap: 14 },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      justifyContent: "center",
      alignItems: "center",
    },
    avatarText: { color: "#FFFFFF", fontWeight: "800", fontSize: 20 },
    usernameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    username: { fontSize: 20, fontWeight: "800" },
    adminBadge: { borderWidth: 1.5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
    adminBadgeText: { fontSize: 12, fontWeight: "900", letterSpacing: 0.5 },
    meta: { marginTop: 4, fontSize: 13, fontWeight: "600" },
    editToggle: {
      marginTop: 14,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderWidth: 1.5,
      alignItems: "center",
    },
    editToggleText: { fontSize: 14, fontWeight: "800" },
    editBox: { marginTop: 14 },
    editLabel: { fontSize: 13, fontWeight: "800", marginBottom: 8 },
    input: {
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
    },
    emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    emojiBtn: {
      width: 44,
      height: 44,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    emojiText: { fontSize: 20, fontWeight: "700" },
    editButtonsRow: { flexDirection: "row", gap: 10, marginTop: 12 },
    smallBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1.5 },
    smallBtnText: { color: "#FFFFFF", fontWeight: "800" },
    divider: { height: 1, backgroundColor: theme.border, marginVertical: 14, opacity: 0.9 },
    primaryMiniButton: {
      marginTop: 12,
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: "center",
    },
    primaryMiniButtonText: { color: "#FFFFFF", fontWeight: "900" },
    section: {
      borderRadius: 20,
      padding: 18,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      marginBottom: 16,
    },
    sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
    emptyText: { fontSize: 14, fontWeight: "600" },
    item: { paddingVertical: 10, borderTopWidth: 1 },
    itemTitle: { fontSize: 15, fontWeight: "700" },
    itemMeta: { marginTop: 4, fontSize: 12, fontWeight: "600" },
  });