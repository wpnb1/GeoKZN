import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { KAZAN_CENTER } from '@/constants/map';
import { useTheme } from '@/contexts/ThemeContext';
import { Complaint, Event, EventWithArchive } from '@/types/models';

type Props = {
  complaints: Complaint[];
  events: EventWithArchive[];
  archivedEvents: EventWithArchive[];
  onBack: () => void;
  onCreateOfficialEvent: (
    event: Omit<Event, 'id' | 'author' | 'createdAt' | 'archivedManually'>,
  ) => void;
  onArchiveEvent: (eventId: string) => void;
  onRejectComplaint: (reportId: string) => void;
  onDeleteComplaintTarget: (reportId: string) => void;
  onBlockComplaintTarget: (reportId: string) => void;
};

type Tab = 'create' | 'complaints' | 'archive';

export default function AdminPanelScreen({
  complaints,
  events,
  archivedEvents,
  onBack,
  onCreateOfficialEvent,
  onArchiveEvent,
  onRejectComplaint,
  onDeleteComplaintTarget,
  onBlockComplaintTarget,
}: Props) {
  const { theme } = useTheme();
  const [tab, setTab] = useState<Tab>('create');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [endTime, setEndTime] = useState('');

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
    if (!t || !d) return;

    const dt = endTime.trim();
    const parsedEnd = dt ? new Date(dt) : null;

    onCreateOfficialEvent({
      type: 'official',
      title: t,
      description: d,
      lat: KAZAN_CENTER.latitude,
      lng: KAZAN_CENTER.longitude,
      endTime: parsedEnd,
      isAdminEvent: true,
    } as any);

    setTitle('');
    setDescription('');
    setEndTime('');
  };

  const TabButton = ({ value, label }: { value: Tab; label: string }) => {
    const active = tab === value;
    return (
      <TouchableOpacity
        style={[styles.tab, { borderBottomColor: active ? theme.primary : 'transparent' }]}
        onPress={() => setTab(value)}
        activeOpacity={0.7}
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

      <View style={[styles.tabsRow, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TabButton value="create" label="Создать" />
        <TabButton value="complaints" label={`Жалобы (${pendingComplaints.length})`} />
        <TabButton value="archive" label="Архив" />
      </View>

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
                onChangeText={setDescription}
                placeholder="Что происходит и до какого времени"
                placeholderTextColor={theme.textDisabled}
                multiline
              />
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
                <View style={styles.complaintHeader}>
                  <Text style={[styles.complaintTitle, { color: theme.text }]}>
                    {c.type === 'event' ? 'Событие' : 'Комментарий'} #{c.targetId}
                  </Text>
                  <Text style={[styles.complaintMeta, { color: theme.textDisabled }]}>
                    {formatDateTime(c.createdAt)}
                  </Text>
                </View>

                <Text style={[styles.complaintMeta, { color: theme.textSecondary }]}>
                  От: <Text style={{ fontWeight: '800', color: theme.text }}>{c.reporter}</Text>
                </Text>

                <View style={[styles.reasonBox, { backgroundColor: theme.surfaceVariant }]}>
                  <Text style={[styles.reasonText, { color: theme.text }]}>{c.reason}</Text>
                </View>

                <View style={styles.complaintButtons}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.warning }]}
                    onPress={() => onDeleteComplaintTarget(c.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Удалить</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.error }]}
                    onPress={() => onBlockComplaintTarget(c.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionBtnText}>Заблокировать</Text>
                  </TouchableOpacity>

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
    tabsRow: { flexDirection: 'row', borderBottomWidth: 1 },
    tab: {
      flex: 1,
      paddingVertical: 14,
      alignItems: 'center',
      borderBottomWidth: 3,
      paddingHorizontal: 8,
    },
    tabText: { fontSize: 13 },
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
    hint: { marginTop: 8, fontSize: 12, fontWeight: '600' },
    input: {
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
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
    reasonBox: { borderRadius: 10, padding: 12, marginTop: 10 },
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
      minWidth: 130,
      flexGrow: 1,
    },
    actionBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
    actionBtnOutline: {
      borderRadius: 10,
      borderWidth: 2,
      paddingVertical: 12,
      paddingHorizontal: 14,
      alignItems: 'center',
      minWidth: 130,
      flexGrow: 1,
    },
    actionBtnOutlineText: { fontSize: 13, fontWeight: '900' },
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
  });
