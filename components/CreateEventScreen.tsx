import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';

import { KAZAN_BOUNDS, KAZAN_CENTER } from '@/constants/map';
import { useTheme } from '@/contexts/ThemeContext';
import { EventType, EventWithArchive, User } from '@/types/models';

type CreatePayload = {
  type: EventType;
  title: string;
  description: string;
  lat: number;
  lng: number;
  // Used only for official events (admin). For other types ignored.
  endTime: Date | null;
};

type Props = {
  currentUser: User;
  onCreateEvent?: (event: CreatePayload) => void;
  onUpdateEvent?: (eventId: string, event: CreatePayload) => void;
  onCancel: () => void;
  initialCoords?: { latitude: number; longitude: number } | null;
  initialEvent?: EventWithArchive | null;
};

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'accident', label: 'ДТП' },
  { value: 'police', label: 'Пост ДПС' },
  { value: 'chat', label: 'Чат' },
  { value: 'official', label: 'Официальное' },
  { value: 'other', label: 'Другое' },
];

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

export default function CreateEventScreen({
  currentUser,
  onCreateEvent,
  onUpdateEvent,
  onCancel,
  initialCoords,
  initialEvent,
}: Props) {
  const { theme } = useTheme();

  const mode = initialEvent ? 'edit' : 'create';

  const initialCoord = useMemo(() => {
    if (initialEvent) return { latitude: initialEvent.lat, longitude: initialEvent.lng };
    return {
      latitude: initialCoords?.latitude ?? KAZAN_CENTER.latitude,
      longitude: initialCoords?.longitude ?? KAZAN_CENTER.longitude,
    };
  }, [initialCoords?.latitude, initialCoords?.longitude, initialEvent]);

  const [type, setType] = useState<EventType>(initialEvent?.type ?? 'other');
  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');

  const [endTimeText, setEndTimeText] = useState(() => {
    if (initialEvent?.endTime) {
      // Keep it editable and readable; user may paste local ISO.
      return initialEvent.endTime.toISOString().slice(0, 19);
    }
    return '';
  });

  const [region, setRegion] = useState<Region>({
    latitude: initialCoord.latitude,
    longitude: initialCoord.longitude,
    latitudeDelta: KAZAN_CENTER.latitudeDelta,
    longitudeDelta: KAZAN_CENTER.longitudeDelta,
  });

  const [selectedCoord, setSelectedCoord] = useState<{ latitude: number; longitude: number }>(
    clampCoord(initialCoord),
  );

  const canPickOfficial = currentUser.isAdmin;
  const isOfficial = type === 'official';

  const parseEndTime = (): Date | null => {
    const raw = endTimeText.trim();
    if (!raw) return null;
    const dt = new Date(raw);
    if (!Number.isFinite(dt.getTime())) return null;
    return dt;
  };

  const handleSubmit = () => {
    const t = title.trim();
    const d = description.trim();
    if (!t || !d) return;

    const endTime = isOfficial ? parseEndTime() : null;
    if (isOfficial && canPickOfficial && !endTime) {
      // Required by backend for official events.
      return;
    }

    const payload: CreatePayload = {
      type,
      title: t,
      description: d,
      lat: selectedCoord.latitude,
      lng: selectedCoord.longitude,
      endTime,
    };

    if (mode === 'edit') {
      if (!initialEvent || !onUpdateEvent) return;
      onUpdateEvent(initialEvent.id, payload);
      return;
    }

    if (!onCreateEvent) return;
    onCreateEvent(payload);
  };

  const handleMapPress = (e: any) => {
    const coord = e?.nativeEvent?.coordinate;
    if (!coord) return;

    const lat = Number(coord.latitude);
    const lng = Number(coord.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setSelectedCoord(clampCoord({ latitude: lat, longitude: lng }));
  };

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
        <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
          <Text style={[styles.backText, { color: theme.primary }]}>← Назад</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === 'edit' ? 'Редактирование события' : 'Создание события'}
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Тип события</Text>
            <View style={styles.typeRow}>
              {eventTypes.map((t) => {
                const active = type === t.value;
                const disabled = t.value === 'official' && !canPickOfficial;
                return (
                  <TouchableOpacity
                    key={t.value}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active ? theme.primary : theme.surfaceVariant,
                        borderColor: active ? theme.primary : theme.border,
                        opacity: disabled ? 0.4 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (disabled) return;
                      setType(t.value);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeChipText, { color: active ? '#FFFFFF' : theme.text }]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {!canPickOfficial ? (
              <Text style={[styles.hint, { color: theme.textDisabled }]}>
                Официальные события доступны только администратору.
              </Text>
            ) : null}
          </View>

          {canPickOfficial && isOfficial ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Окончание (ISO)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceVariant,
                    borderColor: theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="2026-03-10T18:00:00"
                placeholderTextColor={theme.textDisabled}
                value={endTimeText}
                onChangeText={setEndTimeText}
                autoCapitalize="none"
              />
              <Text style={[styles.hint, { color: theme.textDisabled }]}>
                Для официальных событий дата окончания обязательна (после нее событие уйдет в архив).
              </Text>
              {endTimeText.trim().length === 0 ? (
                <Text style={[styles.hint, { color: theme.error }]}>Поле обязательно.</Text>
              ) : !parseEndTime() ? (
                <Text style={[styles.hint, { color: theme.error }]}>Введите корректную дату в формате ISO.</Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Заголовок</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.surfaceVariant,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Введите заголовок"
              placeholderTextColor={theme.textDisabled}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Описание</Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: theme.surfaceVariant,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Введите описание"
              placeholderTextColor={theme.textDisabled}
              value={description}
              onChangeText={setDescription}
              multiline
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Место на карте</Text>
            <View
              style={[
                styles.mapContainer,
                {
                  backgroundColor: theme.surfaceVariant,
                  borderColor: theme.border,
                  shadowColor: theme.shadow,
                },
              ]}
            >
              <MapView
                style={styles.map}
                region={region}
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
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary }]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={canPickOfficial && isOfficial && !parseEndTime()}
            >
              <Text style={styles.primaryButtonText}>{mode === 'edit' ? 'Сохранить' : 'Создать'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.outlineButton, { borderColor: theme.border, backgroundColor: theme.surface }]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={[styles.outlineButtonText, { color: theme.text }]}>Отмена</Text>
            </TouchableOpacity>
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
      elevation: 6,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
    },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
    field: { marginBottom: 18 },
    label: { fontSize: 15, marginBottom: 10, fontWeight: '600' },
    hint: { marginTop: 10, fontSize: 13 },
    input: {
      borderRadius: 12,
      borderWidth: 1.5,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
    },
    textArea: { height: 100, textAlignVertical: 'top' },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    typeChip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 2,
      minWidth: 110,
      alignItems: 'center',
    },
    typeChipText: { fontSize: 14, fontWeight: '600' },
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
    map: { height: 240 },
    coordsBox: {
      borderRadius: 10,
      padding: 12,
    },
    coordsText: {
      fontSize: 13,
      fontWeight: '500',
    },
    buttonsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    primaryButton: {
      flex: 1,
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    primaryButtonText: { color: '#FFFFFF', fontWeight: '600', fontSize: 16 },
    outlineButton: {
      flex: 1,
      borderRadius: 12,
      borderWidth: 2,
      paddingVertical: 16,
      alignItems: 'center',
    },
    outlineButtonText: { fontWeight: '600', fontSize: 16 },
  });
