import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import { EVENT_DESCRIPTION_MAX_LENGTH } from '@/constants/limits';
import {
  KAZAN_BOUNDS,
  KAZAN_CENTER,
  KAZAN_MIN_ZOOM_LEVEL,
  LOCALITY_NOTICE_SHORT,
} from '@/constants/map';
import { useTheme } from '@/contexts/ThemeContext';
import { AdminUserRow, Complaint, Event, EventWithArchive } from '@/types/models';

type Props = {
  complaints: Complaint[];
  events: EventWithArchive[];
  archivedEvents: EventWithArchive[];
  adminUsers: AdminUserRow[];
  currentAdminUserId?: string;
  onBack: () => void;
  onCreateOfficialEvent: (
    event: Omit<Event, 'id' | 'author' | 'createdAt' | 'archivedManually'>,
  ) => void;
  onArchiveEvent: (eventId: string) => void;
  onRejectComplaint: (reportId: string) => void;
  onDeleteComplaintTarget: (reportId: string) => void;
  onBlockComplaintTarget: (reportId: string) => void;
  onReloadAdminUsers: (query?: string) => void;
  onBlockUser: (userId: string, durationMinutes: number | null) => void;
  onUnblockUser: (userId: string) => void;
};

type Tab = 'create' | 'complaints' | 'archive' | 'users';

function clampRegion(region: Region): Region {
  let { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  if (latitude < KAZAN_BOUNDS.minLat) latitude = KAZAN_BOUNDS.minLat;
  else if (latitude > KAZAN_BOUNDS.maxLat) latitude = KAZAN_BOUNDS.maxLat;

  if (longitude < KAZAN_BOUNDS.minLng) longitude = KAZAN_BOUNDS.minLng;
  else if (longitude > KAZAN_BOUNDS.maxLng) longitude = KAZAN_BOUNDS.maxLng;

  const maxDelta = 0.6;
  latitudeDelta = Math.min(latitudeDelta, maxDelta);
  longitudeDelta = Math.min(longitudeDelta, maxDelta);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

function clampCoord(coord: { latitude: number; longitude: number }) {
  return {
    latitude: Math.min(Math.max(coord.latitude, KAZAN_BOUNDS.minLat), KAZAN_BOUNDS.maxLat),
    longitude: Math.min(Math.max(coord.longitude, KAZAN_BOUNDS.minLng), KAZAN_BOUNDS.maxLng),
  };
}

function truncateText(text: string | null | undefined, max: number) {
  if (!text) return '';
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function AdminPanelScreen({
  complaints,
  events,
  archivedEvents,
  adminUsers,
  currentAdminUserId,
  onBack,
  onCreateOfficialEvent,
  onArchiveEvent,
  onRejectComplaint,
  onDeleteComplaintTarget,
  onBlockComplaintTarget,
  onReloadAdminUsers,
  onBlockUser,
  onUnblockUser,
}: Props) {
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>('create');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endTime, setEndTime] = useState('');

  const [region, setRegion] = useState<Region>(KAZAN_CENTER);
  const [selectedCoord, setSelectedCoord] = useState<{ latitude: number; longitude: number }>(() =>
    clampCoord({ latitude: KAZAN_CENTER.latitude, longitude: KAZAN_CENTER.longitude }),
  );

  const [detailComplaint, setDetailComplaint] = useState<Complaint | null>(null);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    if (tab !== 'users') return;
    const timer = setTimeout(() => {
      onReloadAdminUsers(userSearch);
    }, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, userSearch]);

  const pendingComplaints = useMemo(() => complaints, [complaints]);

  const formatDateTime = (date: Date) =>
    new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);

  const styles = createStyles(theme);

  const createOfficial = () => {
    const t = title.trim();
    const d = description.trim();
    if (!t) return;

    const dt = endTime.trim();
    const parsedEnd = dt ? new Date(dt) : null;

    onCreateOfficialEvent({
      type: 'official',
      title: t,
      description: d,
      lat: selectedCoord.latitude,
      lng: selectedCoord.longitude,
      endTime: parsedEnd,
      isAdminEvent: true,
    } as any);

    setTitle('');
    setDescription('');
    setEndTime('');
  };

  const handleMapPress = (e: any) => {
    const coord = e?.nativeEvent?.coordinate;
    if (!coord) return;
    const lat = Number(coord.latitude);
    const lng = Number(coord.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setSelectedCoord(clampCoord({ latitude: lat, longitude: lng }));
  };

  const promptBlockDuration = (username: string, userId: string) => {
    Alert.alert(`Заблокировать «${username}»`, 'Выберите срок', [
      { text: 'Отмена', style: 'cancel' },
      { text: '1 час', onPress: () => onBlockUser(userId, 60) },
      { text: '24 часа', onPress: () => onBlockUser(userId, 24 * 60) },
      { text: '7 дней', onPress: () => onBlockUser(userId, 7 * 24 * 60) },
      { text: 'Навсегда', style: 'destructive', onPress: () => onBlockUser(userId, null) },
    ]);
  };

  const TabButton = ({ value, label }: { value: Tab; label: string }) => {
    const active = tab === value;
    return (
      <TouchableOpacity
        style={[styles.tab, { borderBottomColor: active ? theme.primary : 'transparent' }]}
        onPress={() => setTab(value)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      >
        <Text
          style={[
            styles.tabText,
            {
              color: active ? theme.primary : theme.textSecondary,
              fontWeight: active ? '800' : '700',
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const canBlockComplaintTarget = (c: Complaint) => {
    if (!currentAdminUserId || !c.targetUserId) return true;
    return c.targetUserId !== currentAdminUserId;
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
          <Text style={[styles.backText, { color: theme.primary }]}>← Назад к карте</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          Панель администратора
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.tabsScroll, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}
        contentContainerStyle={styles.tabsScrollContent}
      >
        <TabButton value="create" label="Создать" />
        <TabButton value="complaints" label={`Жалобы (${pendingComplaints.length})`} />
        <TabButton value="users" label={`Пользователи (${adminUsers.length})`} />
        <TabButton value="archive" label="Архив" />
      </ScrollView>

      {tab === 'create' && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Официальное событие</Text>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Заголовок</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.text }]}
                value={title}
                onChangeText={setTitle}
                placeholder="Например: Перекрытие дороги"
                placeholderTextColor={theme.textDisabled}
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Описание</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.text },
                ]}
                value={description}
                onChangeText={(next) => setDescription(next.slice(0, EVENT_DESCRIPTION_MAX_LENGTH))}
                placeholder="Что происходит и до какого времени"
                placeholderTextColor={theme.textDisabled}
                multiline
              />
              <Text style={[styles.hint, { color: theme.textDisabled }]}>
                Макс. {EVENT_DESCRIPTION_MAX_LENGTH} символов. Сейчас: {description.length}
              </Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Окончание (ISO)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.text }]}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="2026-03-10T18:00:00"
                placeholderTextColor={theme.textDisabled}
                autoCapitalize="none"
              />
              <Text style={[styles.hint, { color: theme.textDisabled }]}>Это время нужно для автоархивации официального события.</Text>
            </View>

            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Локация на карте</Text>
              <Text style={[styles.localityHint, { color: theme.textSecondary }]}>{LOCALITY_NOTICE_SHORT}</Text>
              <View
                style={[
                  styles.mapContainer,
                  { backgroundColor: theme.surfaceVariant, borderColor: theme.border, shadowColor: theme.shadow },
                ]}
              >
                <MapView
                  style={styles.map}
                  region={region}
                  minZoomLevel={KAZAN_MIN_ZOOM_LEVEL}
                  onRegionChangeComplete={(r) => setRegion(clampRegion(r))}
                  onPress={handleMapPress}
                >
                  <Marker coordinate={selectedCoord} />
                </MapView>
              </View>
              <View style={[styles.coordsBox, { backgroundColor: theme.surfaceVariant }]}>
                <Text style={[styles.coordsText, { color: theme.textSecondary }]}>
                  Координаты: {selectedCoord.latitude.toFixed(4)}, {selectedCoord.longitude.toFixed(4)}
                </Text>
              </View>
              <Text style={[styles.hint, { color: theme.textDisabled }]}>Нажми на карту, чтобы выбрать точку.</Text>
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={createOfficial}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Создать</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {tab === 'complaints' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Жалобы</Text>

          {pendingComplaints.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Нет активных жалоб.</Text>
            </View>
          ) : (
            pendingComplaints.map((c) => (
              <View
                key={c.id}
                style={[
                  styles.complaintItem,
                  {
                    backgroundColor: theme.surface,
                    borderLeftColor: theme.error,
                    shadowColor: theme.shadow,
                  },
                ]}
              >
                <TouchableOpacity activeOpacity={0.85} onPress={() => setDetailComplaint(c)}>
                  <View style={styles.complaintHeader}>
                    <Text style={[styles.complaintTitle, { color: theme.text }]}>
                      {c.type === 'event' ? 'Событие' : 'Комментарий'} #{c.targetId}
                    </Text>
                    <Text style={[styles.complaintMeta, { color: theme.textDisabled }]}>{formatDateTime(c.createdAt)}</Text>
                  </View>

                  <Text style={[styles.complaintHint, { color: theme.primary }]}>Нажмите, чтобы открыть объект жалобы</Text>

                  <Text style={[styles.complaintMeta, { color: theme.textSecondary }]}>
                    От: <Text style={{ fontWeight: '800', color: theme.text }}>{c.reporter}</Text>
                    {c.targetUsername ? (
                      <>
                        {' · '}
                        Автор контента: <Text style={{ fontWeight: '800', color: theme.text }}>{c.targetUsername}</Text>
                      </>
                    ) : null}
                  </Text>

                  <View style={[styles.reasonBox, { backgroundColor: theme.surfaceVariant }]}>
                    <Text style={[styles.reasonLabel, { color: theme.textSecondary }]}>Причина (шаблон)</Text>
                    <Text style={[styles.reasonText, { color: theme.text }]}>{c.reason}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.complaintButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.warning }]}
                    onPress={() => onDeleteComplaintTarget(c.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Удалить</Text>
                  </TouchableOpacity>

                  {canBlockComplaintTarget(c) ? (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.error }]}
                      onPress={() => onBlockComplaintTarget(c.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionBtnText}>Заблокировать автора</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.actionBtnOutline, { borderColor: theme.border, backgroundColor: theme.surface }]}
                    onPress={() => onRejectComplaint(c.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.actionBtnOutlineText, { color: theme.text }]}>Отклонить</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {tab === 'users' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Пользователи</Text>
          <Text style={[styles.hint, { color: theme.textDisabled, marginBottom: 12 }]}>
            Поиск по никнейму. Блокировка может быть временной (автоматически снимется) или постоянной.
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surfaceVariant, borderColor: theme.border, color: theme.text, marginBottom: 16 }]}
            placeholder="Поиск по никнейму…"
            placeholderTextColor={theme.textDisabled}
            value={userSearch}
            onChangeText={setUserSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />

          {adminUsers.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Никого не найдено.</Text>
          ) : (
            adminUsers.map((u) => {
              const isSelf = currentAdminUserId != null && u.userId === currentAdminUserId;
              return (
                <View
                  key={u.userId}
                  style={[styles.userRow, { backgroundColor: theme.surface, borderColor: theme.border, shadowColor: theme.shadow }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.userName, { color: theme.text }]} numberOfLines={1}>
                      {u.username}
                      {u.isAdmin ? <Text style={{ color: theme.secondary }}> · admin</Text> : null}
                    </Text>
                    <Text style={[styles.userMeta, { color: theme.textSecondary }]}>{formatDateTime(u.createdAt)}</Text>
                    {u.isBlocked ? (
                      <Text style={[styles.blockedBadge, { color: theme.error }]}>Заблокирован</Text>
                    ) : (
                      <Text style={[styles.blockedBadge, { color: theme.textDisabled }]}>Активен</Text>
                    )}
                  </View>
                  {!isSelf && !u.isAdmin ? (
                    u.isBlocked ? (
                      <TouchableOpacity
                        style={[styles.userAction, { borderColor: theme.primary }]}
                        onPress={() => onUnblockUser(u.userId)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.userActionText, { color: theme.primary }]}>Разблокировать</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.userAction, { borderColor: theme.error, backgroundColor: theme.error + '15' }]}
                        onPress={() => promptBlockDuration(u.username, u.userId)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.userActionText, { color: theme.error }]}>Заблокировать</Text>
                      </TouchableOpacity>
                    )
                  ) : isSelf ? (
                    <Text style={[styles.selfNote, { color: theme.textDisabled }]}>Вы</Text>
                  ) : (
                    <Text style={[styles.selfNote, { color: theme.textDisabled }]}>Админ</Text>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      {tab === 'archive' && (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Архивация событий</Text>

          <Text style={[styles.subTitle, { color: theme.textSecondary }]}>Активные ({events.length})</Text>
          {events.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Нет событий для архивации.</Text>
          ) : (
            events.map((e) => (
              <View key={e.id} style={[styles.archiveItem, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
                <Text style={[styles.itemTitle, { color: theme.text }]}>{e.title}</Text>
                <Text style={[styles.itemMeta, { color: theme.textSecondary }]}>
                  Автор: {e.author} • {formatDateTime(e.createdAt)}
                </Text>
                <TouchableOpacity
                  style={[styles.actionBtnOutline, { borderColor: theme.primary, backgroundColor: theme.surface }]}
                  onPress={() => onArchiveEvent(e.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionBtnOutlineText, { color: theme.primary }]}>Архивировать</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          <Text style={[styles.subTitle, { color: theme.textSecondary, marginTop: 18 }]}>Архив ({archivedEvents.length})</Text>
          {archivedEvents.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Архив пуст.</Text>
          ) : (
            archivedEvents.map((e) => (
              <View key={e.id} style={[styles.archiveItem, { backgroundColor: theme.surfaceVariant, opacity: 0.85 }]}>
                <Text style={[styles.itemTitle, { color: theme.textSecondary }]}>{e.title}</Text>
                <Text style={[styles.itemMeta, { color: theme.textDisabled }]}>
                  Автор: {e.author} • {formatDateTime(e.createdAt)}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={detailComplaint != null} animationType="slide" transparent onRequestClose={() => setDetailComplaint(null)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Объект жалобы</Text>
            {detailComplaint ? (
              <>
                <ScrollView style={styles.modalScroll}>
                  <Text style={[styles.modalSection, { color: theme.textSecondary }]}>Тип</Text>
                  <Text style={[styles.modalBody, { color: theme.text }]}>
                    {detailComplaint.type === 'event' ? 'Событие' : 'Комментарий'} · ID {detailComplaint.targetId}
                  </Text>

                  {detailComplaint.type === 'event' ? (
                    <>
                      <Text style={[styles.modalSection, { color: theme.textSecondary }]}>Событие</Text>
                      <Text style={[styles.modalBody, { color: theme.text }]}>
                        {detailComplaint.eventTitle || '—'}
                      </Text>
                      <Text style={[styles.modalMuted, { color: theme.textDisabled }]}>
                        {truncateText(detailComplaint.eventDescription, 400) || 'Без описания'}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.modalSection, { color: theme.textSecondary }]}>Комментарий</Text>
                      <Text style={[styles.modalBody, { color: theme.text }]}>
                        {detailComplaint.commentText || '—'}
                      </Text>
                      <Text style={[styles.modalSection, { color: theme.textSecondary, marginTop: 12 }]}>Событие (контекст)</Text>
                      <Text style={[styles.modalBody, { color: theme.text }]}>
                        {detailComplaint.commentEventTitle || '—'}
                      </Text>
                    </>
                  )}

                  <Text style={[styles.modalSection, { color: theme.textSecondary }]}>Причина жалобы</Text>
                  <Text style={[styles.modalBody, { color: theme.text }]}>{detailComplaint.reason}</Text>

                  {detailComplaint.reportNote ? (
                    <>
                      <Text style={[styles.modalSection, { color: theme.textSecondary }]}>Комментарий заявителя</Text>
                      <Text style={[styles.modalBody, { color: theme.text }]}>{detailComplaint.reportNote}</Text>
                    </>
                  ) : null}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.modalClose, { backgroundColor: theme.primary }]}
                  onPress={() => setDetailComplaint(null)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.modalCloseText}>Закрыть</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
    backText: { fontSize: 16, fontWeight: '800' },
    headerTitle: { marginTop: 8, fontSize: 18, fontWeight: '900' },
    tabsScroll: { height: 56, maxHeight: 56, flexGrow: 0, borderBottomWidth: 1 },
    tabsScrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      height: 56,
    },
    tab: {
      height: 56,
      justifyContent: 'center',
      alignItems: 'center',
      borderBottomWidth: 3,
      paddingHorizontal: 14,
      minWidth: 112,
    },
    tabText: { fontSize: 12 },
    content: { padding: 16, paddingBottom: 24 },
    card: {
      borderRadius: 20,
      padding: 20,
      elevation: 6,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    sectionTitle: { fontSize: 20, fontWeight: '900', marginBottom: 16 },
    subTitle: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
    field: { marginBottom: 16 },
    label: { fontSize: 14, fontWeight: '800', marginBottom: 8 },
    localityHint: { fontSize: 12, fontWeight: '600', marginBottom: 10, lineHeight: 18 },
    hint: { marginTop: 8, fontSize: 12, fontWeight: '600' },
    input: {
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    mapContainer: {
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 2,
      marginBottom: 10,
      elevation: 2,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    map: { height: 220 },
    coordsBox: { borderRadius: 10, padding: 12 },
    coordsText: { fontSize: 13, fontWeight: '700' },
    primaryButton: {
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 8,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    primaryButtonText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
    emptyCard: {
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      elevation: 2,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    emptyText: { fontSize: 14, fontWeight: '700' },
    complaintItem: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      borderLeftWidth: 4,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    complaintHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
    },
    complaintTitle: { fontSize: 15, fontWeight: '900', flex: 1 },
    complaintMeta: { fontSize: 12, fontWeight: '700', marginTop: 6 },
    complaintHint: { fontSize: 12, fontWeight: '700', marginTop: 6 },
    reasonBox: { borderRadius: 10, padding: 12, marginTop: 10 },
    reasonLabel: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
    reasonText: { fontSize: 14, fontWeight: '700' },
    complaintButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 12,
    },
    actionBtn: {
      borderRadius: 10,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      minWidth: 120,
      flexGrow: 1,
    },
    actionBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
    actionBtnOutline: {
      borderRadius: 10,
      borderWidth: 2,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      minWidth: 120,
      flexGrow: 1,
    },
    actionBtnOutlineText: { fontSize: 12, fontWeight: '900' },
    archiveItem: {
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    itemTitle: { fontSize: 16, fontWeight: '900', marginBottom: 6 },
    itemMeta: { fontSize: 12, fontWeight: '700', marginBottom: 10 },
    userRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      elevation: 2,
    },
    userName: { fontSize: 16, fontWeight: '800' },
    userMeta: { fontSize: 11, marginTop: 4, fontWeight: '600' },
    blockedBadge: { fontSize: 12, fontWeight: '800', marginTop: 4 },
    userAction: {
      borderRadius: 10,
      borderWidth: 2,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    userActionText: { fontSize: 12, fontWeight: '900' },
    selfNote: { fontSize: 12, fontWeight: '800' },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: 20,
    },
    modalCard: {
      borderRadius: 18,
      padding: 18,
      maxHeight: '85%',
    },
    modalTitle: { fontSize: 18, fontWeight: '900', marginBottom: 12 },
    modalScroll: { maxHeight: 420 },
    modalSection: { fontSize: 12, fontWeight: '800', marginTop: 10 },
    modalBody: { fontSize: 15, fontWeight: '700', marginTop: 4, lineHeight: 22 },
    modalMuted: { fontSize: 13, fontWeight: '600', marginTop: 6, lineHeight: 20 },
    modalClose: {
      marginTop: 14,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalCloseText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },
  });
