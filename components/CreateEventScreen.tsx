import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
} from '@/constants/limits';
import {
  KAZAN_CENTER,
  KAZAN_MIN_ZOOM_LEVEL,
  LOCALITY_NOTICE_SHORT,
} from '@/constants/map';
import { useTheme } from '@/contexts/ThemeContext';
import { clampMapCoord, useBoundedMapRegion } from '@/lib/useBoundedMapRegion';
import { EventType, EventWithArchive, User } from '@/types/models';

type CreatePayload = {
  type: EventType;
  title: string;
  description: string;
  lat: number;
  lng: number;
  endTime: Date | null;
};

type Props = {
  currentUser: User;
  onCreateEvent?: (event: CreatePayload) => void;
  onUpdateEvent?: (eventId: string, event: CreatePayload) => void;
  onCancel: () => void;
  onGoToMap?: () => void;
  initialCoords?: { latitude: number; longitude: number } | null;
  initialEvent?: EventWithArchive | null;
};

type FormErrors = {
  type?: string;
  title?: string;
  endTime?: string;
};

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'accident', label: 'ДТП' },
  { value: 'police', label: 'Пост ДПС' },
  { value: 'chat', label: 'Чат' },
  { value: 'official', label: 'Официальное' },
  { value: 'other', label: 'Другое' },
];

export default function CreateEventScreen({
  currentUser,
  onCreateEvent,
  onUpdateEvent,
  onCancel,
  onGoToMap,
  initialCoords,
  initialEvent,
}: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  const mode = initialEvent ? 'edit' : 'create';
  const initialCoord = useMemo(() => {
    if (initialEvent) return { latitude: initialEvent.lat, longitude: initialEvent.lng };
    return {
      latitude: initialCoords?.latitude ?? KAZAN_CENTER.latitude,
      longitude: initialCoords?.longitude ?? KAZAN_CENTER.longitude,
    };
  }, [initialCoords?.latitude, initialCoords?.longitude, initialEvent]);

  const [type, setType] = useState<EventType | null>(initialEvent?.type ?? null);
  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [endTimeText, setEndTimeText] = useState(() => {
    if (initialEvent?.endTime) {
      return initialEvent.endTime.toISOString().slice(0, 19);
    }
    return '';
  });
  const { mapRef, region, handleMapPanDrag, handleRegionChangeComplete } =
    useBoundedMapRegion({
      latitude: initialCoord.latitude,
      longitude: initialCoord.longitude,
      latitudeDelta: KAZAN_CENTER.latitudeDelta,
      longitudeDelta: KAZAN_CENTER.longitudeDelta,
    });
  const [selectedCoord, setSelectedCoord] = useState<{ latitude: number; longitude: number }>(
    clampMapCoord(initialCoord),
  );
  const handleGoToMainMap = () => {
    setIsMapPickerOpen(false);
    onGoToMap?.();
  };

  const canPickOfficial = currentUser.isAdmin;
  const isOfficial = type === 'official';
  const styles = createStyles(theme);

  const parseEndTime = (): Date | null => {
    const raw = endTimeText.trim();
    if (!raw) return null;
    const dt = new Date(raw);
    if (!Number.isFinite(dt.getTime())) return null;
    return dt;
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const endTime = isOfficial ? parseEndTime() : null;
    const nextErrors: FormErrors = {};

    if (!type) {
      nextErrors.type = 'Выберите тип события.';
    }
    if (!trimmedTitle) {
      nextErrors.title = 'Введите заголовок события.';
    } else if (trimmedTitle.length > EVENT_TITLE_MAX_LENGTH) {
      nextErrors.title = `Заголовок не должен превышать ${EVENT_TITLE_MAX_LENGTH} символов.`;
    }
    if (isOfficial && canPickOfficial && !endTimeText.trim()) {
      nextErrors.endTime = 'Укажите дату окончания.';
    } else if (isOfficial && canPickOfficial && !endTime) {
      nextErrors.endTime = 'Введите корректную дату в формате ISO.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !type) return;

    const payload: CreatePayload = {
      type,
      title: trimmedTitle,
      description: trimmedDescription,
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

    setSelectedCoord(clampMapCoord({ latitude: lat, longitude: lng }));
  };

  const previewRegion = useMemo(
    () => ({
      latitude: selectedCoord.latitude,
      longitude: selectedCoord.longitude,
      latitudeDelta: Math.min(region.latitudeDelta, 0.04),
      longitudeDelta: Math.min(region.longitudeDelta, 0.04),
    }),
    [region.latitudeDelta, region.longitudeDelta, selectedCoord.latitude, selectedCoord.longitude],
  );

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
          <Text style={[styles.backText, { color: theme.primary }]}>Назад</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.surface, shadowColor: theme.shadow }]}>
          <Text style={[styles.title, { color: theme.text }]}>
            {mode === 'edit' ? 'Редактирование события' : 'Создание события'}
          </Text>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Тип события</Text>
            <View
              style={[
                styles.typeRow,
                styles.typeRowWrap,
                errors.type ? { borderColor: theme.error, backgroundColor: theme.error + '12' } : null,
              ]}
            >
              {eventTypes.map((item) => {
                const active = type === item.value;
                const disabled = item.value === 'official' && !canPickOfficial;

                return (
                  <TouchableOpacity
                    key={item.value}
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
                      setType(item.value);
                      setErrors((prev) => ({ ...prev, type: undefined }));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.typeChipText, { color: active ? '#FFFFFF' : theme.text }]}>
                      {item.label}
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
            {errors.type ? <Text style={[styles.hint, { color: theme.error }]}>{errors.type}</Text> : null}
          </View>

          {canPickOfficial && isOfficial ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Окончание (ISO)</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.surfaceVariant,
                    borderColor: errors.endTime ? theme.error : theme.border,
                    color: theme.text,
                  },
                ]}
                placeholder="2026-03-10T18:00:00"
                placeholderTextColor={theme.textDisabled}
                value={endTimeText}
                onChangeText={(next) => {
                  setEndTimeText(next);
                  setErrors((prev) => ({ ...prev, endTime: undefined }));
                }}
                autoCapitalize="none"
              />
              <Text style={[styles.hint, { color: theme.textDisabled }]}>
                Для официальных событий дата окончания обязательна.
              </Text>
              {errors.endTime ? (
                <Text style={[styles.hint, { color: theme.error }]}>{errors.endTime}</Text>
              ) : endTimeText.trim().length > 0 && !parseEndTime() ? (
                <Text style={[styles.hint, { color: theme.error }]}>
                  Введите корректную дату в формате ISO.
                </Text>
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
                  borderColor: errors.title ? theme.error : theme.border,
                  color: theme.text,
                },
              ]}
              placeholder="Введите заголовок"
              placeholderTextColor={theme.textDisabled}
              value={title}
              onChangeText={(next) => {
                setTitle(next.slice(0, EVENT_TITLE_MAX_LENGTH));
                setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              maxLength={EVENT_TITLE_MAX_LENGTH}
            />
            <Text style={[styles.hint, { color: theme.textDisabled }]}>
              Макс. {EVENT_TITLE_MAX_LENGTH} символов. Сейчас: {title.length}
            </Text>
            {errors.title ? <Text style={[styles.hint, { color: theme.error }]}>{errors.title}</Text> : null}
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
              onChangeText={(next) => setDescription(next.slice(0, EVENT_DESCRIPTION_MAX_LENGTH))}
              multiline
            />
            <Text style={[styles.hint, { color: theme.textDisabled }]}>
              Макс. {EVENT_DESCRIPTION_MAX_LENGTH} символов. Сейчас: {description.length}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Место на карте</Text>
            <Text style={[styles.localityHint, { color: theme.textSecondary }]}>{LOCALITY_NOTICE_SHORT}</Text>

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
                region={previewRegion}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
                moveOnMarkerPress={false}
              >
                <Marker coordinate={selectedCoord} />
              </MapView>
            </View>

            <TouchableOpacity
              style={[styles.mapPickerButton, { backgroundColor: theme.primary }]}
              onPress={() => setIsMapPickerOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.mapPickerButtonText}>Открыть карту для выбора точки</Text>
            </TouchableOpacity>

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

      <Modal visible={isMapPickerOpen} animationType="slide" onRequestClose={() => setIsMapPickerOpen(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]} edges={['bottom']}>
          <View
            style={[
              styles.modalHeader,
              {
                backgroundColor: theme.surface,
                borderBottomColor: theme.border,
                shadowColor: theme.shadow,
                paddingTop: Math.max(insets.top, 12) + 14,
              },
            ]}
          >
            <TouchableOpacity onPress={() => setIsMapPickerOpen(false)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.modalActionText, { color: theme.textSecondary }]}>Закрыть</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Выбор точки события</Text>
            <TouchableOpacity onPress={() => setIsMapPickerOpen(false)} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.modalActionText, { color: theme.primary }]}>Готово</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.modalHintBox, { backgroundColor: theme.surfaceVariant, borderColor: theme.border }]}>
            <Text style={[styles.modalHintText, { color: theme.textSecondary }]}>
              Переместите карту и нажмите на нужное место. Ограничение по Казани сохранено.
            </Text>
          </View>

          <MapView
            ref={mapRef}
            style={styles.modalMap}
            initialRegion={region}
            minZoomLevel={KAZAN_MIN_ZOOM_LEVEL}
            onPanDrag={handleMapPanDrag}
            onRegionChangeComplete={handleRegionChangeComplete}
            onPress={handleMapPress}
            moveOnMarkerPress={false}
          >
            <Marker coordinate={selectedCoord} />
          </MapView>

          <TouchableOpacity
            style={[styles.modalMapHomeButton, { backgroundColor: theme.primary, shadowColor: theme.shadow }]}
            onPress={handleGoToMainMap}
            activeOpacity={0.85}
          >
            <Text style={styles.modalMapHomeButtonText}>Карта</Text>
          </TouchableOpacity>

          <View
            style={[
              styles.modalCoordsBox,
              {
                backgroundColor: theme.surface,
                paddingBottom: Math.max(insets.bottom, 0) + 14,
              },
            ]}
          >
            <Text style={[styles.modalCoordsText, { color: theme.textSecondary }]}>
              Координаты: {selectedCoord.latitude.toFixed(4)}, {selectedCoord.longitude.toFixed(4)}
            </Text>
          </View>
        </SafeAreaView>
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
    localityHint: { fontSize: 12, marginBottom: 10, fontWeight: '600', lineHeight: 17 },
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
    typeRowWrap: {
      borderWidth: 1.5,
      borderColor: 'transparent',
      borderRadius: 14,
      padding: 8,
    },
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
    mapPickerButton: {
      marginBottom: 10,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      alignItems: 'center',
    },
    mapPickerButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    coordsBox: {
      borderRadius: 10,
      padding: 12,
    },
    coordsText: {
      fontSize: 13,
      fontWeight: '500',
    },
    modalContainer: { flex: 1 },
    modalHeader: {
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 14,
      borderBottomWidth: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    modalActionText: { fontSize: 16, fontWeight: '700', minWidth: 72, paddingVertical: 6 },
    modalTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 8 },
    modalHintBox: {
      marginHorizontal: 16,
      marginTop: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    modalHintText: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
    modalMap: { flex: 1 },
    modalMapHomeButton: {
      position: 'absolute',
      top: 104,
      right: 16,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      elevation: 5,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.18,
      shadowRadius: 6,
    },
    modalMapHomeButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '800',
    },
    modalCoordsBox: {
      margin: 16,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    modalCoordsText: { fontSize: 14, fontWeight: '700' },
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
