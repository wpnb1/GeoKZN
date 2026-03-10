import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useTheme } from "@/contexts/ThemeContext";
import { Comment, EventWithArchive, User } from "@/types/models";

type Props = {
  user: User;
  events: EventWithArchive[];
  comments: Comment[];
  onBack: () => void;
  onLogout: () => void;
};

export default function ProfileScreen({ user, events, comments, onBack, onLogout }: Props) {
  const { theme } = useTheme();

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
              <Text style={styles.avatarText}>{user.username[0]?.toUpperCase() || "U"}</Text>
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

        <View style={[styles.section, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Мои комментарии ({comments.length})</Text>
          {comments.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Пока нет комментариев.</Text>
          ) : (
            comments
              .slice()
              .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
              .slice(0, 50)
              .map((c) => (
                <View key={c.id} style={[styles.item, { borderColor: theme.border }]}>
                  <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>
                    {c.text}
                  </Text>
                  <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                    {formatDateTime(c.createdAt)}
                  </Text>
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