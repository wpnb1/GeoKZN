import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import { useTheme } from '@/contexts/ThemeContext';
import { EventWithArchive, User } from '@/types/models';

type Props = {
  event: EventWithArchive;
  currentUser: User | null;
  onBack: () => void;
  onOpenChat: () => void;
  onDelete: (eventId: string) => void;
  onEdit: (eventId: string) => void;
  onComplaint: (reason: string) => void;
};

const eventTypeLabels: Record<string, string> = {
  accident: 'ДТП',
  police: 'Пост ДПС',
  chat: 'Чат',
  official: 'Официальное событие',
  other: 'Другое',
};

const eventTypeColors: Record<string, string> = {
  accident: '#e53935',
  police: '#1e88e5',
  chat: '#43a047',
  official: '#8e24aa',
  other: '#757575',
};

export default function EventDetailsScreen({
  event,
  currentUser,
  onBack,
  onOpenChat,
  onDelete,
  onEdit,
  onComplaint,
}: Props) {
  const { theme } = useTheme();

  const isOwner = currentUser?.username === event.author;
  const isAdmin = currentUser?.isAdmin;
  const canReport = Boolean(currentUser && !isOwner && !isAdmin);

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  const styles = createStyles(theme);
  const typeColor = eventTypeColors[event.type] || eventTypeColors.other;

  const previewRegion = useMemo<Region>(() => {
    // Small delta for a readable preview; MapView will clamp visually anyway.
    return {
      latitude: event.lat,
      longitude: event.lng,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [event.lat, event.lng]);

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
          <Text style={[styles.backText, { color: theme.primary }]}>← Назад к карте</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.surface,
              shadowColor: theme.shadow,
              borderLeftColor: typeColor,
            },
          ]}
        >
          <View style={styles.typeRow}>
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor: typeColor + '20',
                  borderColor: typeColor,
                },
              ]}
            >
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>
                {eventTypeLabels[event.type] ?? event.type}
              </Text>
            </View>

            {event.endTime && (
              <View
                style={[
                  styles.endTimeBadge,
                  {
                    backgroundColor: theme.secondary + '20',
                    borderColor: theme.secondary,
                  },
                ]}
              >
                <Text style={[styles.endTimeBadgeText, { color: theme.secondary }]}>
                  До {formatDateTime(event.endTime)}
                </Text>
              </View>
            )}

            {event.isArchived && (
              <View
                style={[
                  styles.archivedBadge,
                  {
                    backgroundColor: theme.surfaceVariant,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.archivedBadgeText, { color: theme.textSecondary }]}>Архив</Text>
              </View>
            )}
          </View>

          <Text style={[styles.title, { color: theme.text }]}>{event.title}</Text>

          <View style={[styles.metaBlock, { borderBottomColor: theme.border }]}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Автор:</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{event.author}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Создано:</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>{formatDateTime(event.createdAt)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Координаты:</Text>
              <Text style={[styles.metaValue, { color: theme.text }]}>
                {event.lat.toFixed(4)}, {event.lng.toFixed(4)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.descriptionBox,
              {
                backgroundColor: theme.surfaceVariant,
                borderLeftColor: theme.primary,
              },
            ]}
          >
            <Text style={[styles.descriptionText, { color: theme.text }]}>
              {event.description?.trim() ? event.description : 'Описание отсутствует.'}
            </Text>
          </View>

          {currentUser ? (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={onOpenChat}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>Открыть чат</Text>
              </TouchableOpacity>

              <View style={styles.secondaryRow}>
                {(isOwner || isAdmin) && !event.isArchived && (
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor: theme.primary,
                        backgroundColor: theme.surface,
                      },
                    ]}
                    onPress={() => onEdit(event.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Редактировать</Text>
                  </TouchableOpacity>
                )}

                {(isOwner || isAdmin) && (
                  <TouchableOpacity
                    style={[styles.secondaryButton, { backgroundColor: theme.error, borderColor: theme.error }]}
                    onPress={() => onDelete(event.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.secondaryButtonText, { color: '#FFFFFF' }]}>Удалить</Text>
                  </TouchableOpacity>
                )}

                {canReport && (
                  <TouchableOpacity
                    style={[
                      styles.secondaryButton,
                      {
                        borderColor: theme.primary,
                        backgroundColor: theme.surface,
                      },
                    ]}
                    onPress={() => onComplaint('report')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.secondaryButtonText, { color: theme.primary }]}>Пожаловаться</Text>
                  </TouchableOpacity>
                )}
              </View>
            </>
          ) : (
            <View
              style={[
                styles.noticeBox,
                {
                  backgroundColor: theme.warning + '20',
                  borderLeftColor: theme.warning,
                },
              ]}
            >
              <Text style={[styles.noticeText, { color: theme.warning }]}>
                Авторизуйтесь, чтобы создавать события, писать в чат и отправлять жалобы.
              </Text>
            </View>
          )}
        </View>

        <View
          style={[
            styles.mapPreview,
            {
              backgroundColor: theme.surface,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <Text style={[styles.mapPreviewTitle, { color: theme.text }]}>Место на карте</Text>
          <View style={[styles.mapContainer, { borderColor: theme.border }]}
          >
            <MapView
              style={styles.map}
              initialRegion={previewRegion}
              region={previewRegion}
              scrollEnabled={false}
              zoomEnabled={false}
              rotateEnabled={false}
              pitchEnabled={false}
              toolbarEnabled={false}
              pointerEvents="none"
            >
              <Marker coordinate={{ latitude: event.lat, longitude: event.lng }} />
            </MapView>
          </View>
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
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    backText: { fontSize: 16, fontWeight: '600' },
    content: { padding: 16 },
    card: {
      borderRadius: 20,
      padding: 20,
      marginBottom: 16,
      borderLeftWidth: 4,
      elevation: 6,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    typeBadgeText: { fontSize: 13, fontWeight: '700' },
    endTimeBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    endTimeBadgeText: { fontSize: 13, fontWeight: '700' },
    archivedBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    archivedBadgeText: { fontSize: 13, fontWeight: '700' },
    title: {
      fontSize: 24,
      fontWeight: '700',
      marginBottom: 16,
      lineHeight: 32,
    },
    metaBlock: {
      marginBottom: 16,
      paddingBottom: 16,
      borderBottomWidth: 1,
    },
    metaItem: { flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' },
    metaLabel: { fontSize: 14, marginRight: 8, fontWeight: '500' },
    metaValue: { fontSize: 14, fontWeight: '600' },
    descriptionBox: {
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
      borderLeftWidth: 4,
    },
    descriptionText: { fontSize: 15, lineHeight: 24 },
    primaryButton: {
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    primaryButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    secondaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
    secondaryButton: {
      borderWidth: 2,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      minWidth: 140,
      flexGrow: 1,
    },
    secondaryButtonText: { fontWeight: '700', fontSize: 14 },
    noticeBox: {
      marginTop: 12,
      padding: 14,
      borderRadius: 12,
      borderLeftWidth: 4,
    },
    noticeText: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
    mapPreview: {
      borderRadius: 20,
      padding: 16,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    mapPreviewTitle: { fontSize: 17, fontWeight: '600', marginBottom: 12 },
    mapContainer: {
      height: 190,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 2,
    },
    map: { flex: 1 },
  });
