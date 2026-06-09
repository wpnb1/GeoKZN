import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import LogoMark from '@/components/LogoMark';
import {
  KAZAN_CENTER,
  KAZAN_MIN_ZOOM_LEVEL,
  LOCALITY_NOTICE_SHORT,
} from '@/constants/map';
import { useTheme } from '@/contexts/ThemeContext';
import { clampMapCoord, useBoundedMapRegion } from '@/lib/useBoundedMapRegion';
import { EventType, EventWithArchive, User } from '@/types/models';

type Props = {
  events: EventWithArchive[];
  currentUser: User | null;
  onCreateEvent: () => void;
  onEventClick: (event: EventWithArchive) => void;
  onProfileClick: () => void;
  onLoginClick: () => void;
  onAdminClick: () => void;
  onLogout: () => void;
  onMapLongPress: (coord: { latitude: number; longitude: number }) => void;
};

const eventTypeConfig: Record<EventType, { label: string; color: string }> = {
  accident: { label: 'ДТП', color: '#e53935' },
  police: { label: 'Пост ДПС', color: '#1e88e5' },
  chat: { label: 'Чат', color: '#43a047' },
  official: { label: 'Офиц.', color: '#8e24aa' },
  other: { label: 'Другое', color: '#757575' },
};

const CLUSTER_DELTA_THRESHOLD = 0.072;

type MarkerItem =
  | { kind: 'single'; event: EventWithArchive }
  | { kind: 'cluster'; key: string; events: EventWithArchive[]; lat: number; lng: number };

export default function MapScreen({
  events,
  currentUser,
  onCreateEvent,
  onEventClick,
  onProfileClick,
  onLoginClick,
  onAdminClick,
  onLogout,
  onMapLongPress,
}: Props) {
  const { theme, toggleTheme, isDark } = useTheme();
  const useNativeAndroidMarkers = Platform.OS === 'android';
  const { mapRef, region, handleMapPanDrag, handleRegionChangeComplete } =
    useBoundedMapRegion(KAZAN_CENTER);

  const resetMapViewport = () => {
    mapRef.current?.animateToRegion(KAZAN_CENTER, 220);
  };

  const handleMapLongPress = currentUser
    ? (e: unknown) => {
        const coord = (e as any)?.nativeEvent?.coordinate;
        if (coord && typeof coord.latitude === 'number' && typeof coord.longitude === 'number') {
          onMapLongPress(clampMapCoord(coord));
        }
      }
    : undefined;

  const [filters, setFilters] = useState<Record<EventType, boolean>>({
    accident: true,
    police: true,
    chat: true,
    official: true,
    other: true,
  });

  const [showArchived, setShowArchived] = useState(false);
  const canSeeArchive = Boolean(currentUser?.isAdmin);

  useEffect(() => {
    if (!canSeeArchive && showArchived) setShowArchived(false);
  }, [canSeeArchive, showArchived]);

  const effectiveShowArchived = canSeeArchive && showArchived;

  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (!filters[e.type]) return false;
      if (!effectiveShowArchived && e.isArchived) return false;
      return true;
    });
  }, [events, filters, effectiveShowArchived]);

  const [clusterPick, setClusterPick] = useState<EventWithArchive[] | null>(null);

  const markerItems = useMemo((): MarkerItem[] => {
    const clusterMode =
      !useNativeAndroidMarkers && region.latitudeDelta > CLUSTER_DELTA_THRESHOLD;
    if (!clusterMode) {
      return filteredEvents.map((event) => ({ kind: 'single' as const, event }));
    }
    const groups = new Map<string, EventWithArchive[]>();
    for (const e of filteredEvents) {
      const key = `${e.lat.toFixed(3)}_${e.lng.toFixed(3)}`;
      const arr = groups.get(key) ?? [];
      arr.push(e);
      groups.set(key, arr);
    }
    const out: MarkerItem[] = [];
    for (const [, items] of groups) {
      if (items.length === 1) {
        out.push({ kind: 'single', event: items[0] });
      } else {
        const lat = items.reduce((s, x) => s + x.lat, 0) / items.length;
        const lng = items.reduce((s, x) => s + x.lng, 0) / items.length;
        out.push({
          kind: 'cluster',
          key: `${lat.toFixed(4)}_${lng.toFixed(4)}`,
          events: items,
          lat,
          lng,
        });
      }
    }
    return out;
  }, [filteredEvents, region.latitudeDelta, useNativeAndroidMarkers]);

  const toggleFilter = (type: EventType) => {
    setFilters((prev) => ({ ...prev, [type]: !prev[type] }));
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
        <View style={styles.headerTopRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.logoBadge, { backgroundColor: theme.primary }]}>
              <LogoMark size={22} color="#FFFFFF" accent="#FFFFFF" />
            </View>
            <View style={styles.titleBlock}>
              <Text
                style={[styles.appTitle, { color: theme.text }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                GeoKZN
              </Text>
              <Text
                style={[styles.appSubtitle, { color: theme.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                Карта событий Казани
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.themeButton, { backgroundColor: theme.surfaceVariant }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.headerBottomRow}>
          {currentUser ? (
            <>
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: theme.primary }]}
                onPress={resetMapViewport}
                activeOpacity={0.8}
              >
                <Text style={[styles.smallButtonText, { color: '#FFFFFF' }]}>Карта</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: theme.surfaceVariant }]}
                onPress={onProfileClick}
                activeOpacity={0.7}
              >
                <Text style={[styles.smallButtonText, { color: theme.text }]}>Профиль</Text>
              </TouchableOpacity>

              {currentUser.isAdmin && (
                <TouchableOpacity
                  style={[styles.smallButton, { backgroundColor: theme.secondary + '20' }]}
                  onPress={onAdminClick}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.smallButtonText, { color: theme.secondary }]}>Админ</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: theme.error + '20' }]}
                onPress={onLogout}
                activeOpacity={0.7}
              >
                <Text style={[styles.smallButtonText, { color: theme.error }]}>Выйти</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: theme.primary }]}
                onPress={resetMapViewport}
                activeOpacity={0.8}
              >
                <Text style={[styles.smallButtonText, { color: '#FFFFFF' }]}>Карта</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.smallButton, { backgroundColor: theme.surfaceVariant }]}
                onPress={onLoginClick}
                activeOpacity={0.7}
              >
                <Text style={[styles.smallButtonText, { color: theme.text }]}>Войти</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View
        style={[
          styles.localityBanner,
          { backgroundColor: theme.surfaceVariant, borderColor: theme.border },
        ]}
      >
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={theme.primary}
          style={{ marginRight: 8 }}
        />
        <Text style={[styles.localityText, { color: theme.textSecondary }]}>
          {LOCALITY_NOTICE_SHORT}
        </Text>
      </View>

      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={KAZAN_CENTER}
        minZoomLevel={KAZAN_MIN_ZOOM_LEVEL}
        onPanDrag={handleMapPanDrag}
        onRegionChangeComplete={handleRegionChangeComplete}
        moveOnMarkerPress={false}
        onLongPress={handleMapLongPress}
      >
        {markerItems.map((item) => {
          if (item.kind === 'single') {
            const event = item.event;
            const cfg = eventTypeConfig[event.type] || eventTypeConfig.other;
            if (useNativeAndroidMarkers) {
              return (
                <Marker
                  key={event.id}
                  coordinate={{ latitude: event.lat, longitude: event.lng }}
                  title={event.title}
                  description={event.description}
                  pinColor={cfg.color}
                  onPress={() => onEventClick(event)}
                />
              );
            }
            return (
              <Marker
                key={event.id}
                coordinate={{ latitude: event.lat, longitude: event.lng }}
                title={event.title}
                description={event.description}
                onPress={() => onEventClick(event)}
                tracksViewChanges={false}
              >
                <View
                  style={[
                    styles.markerCircle,
                    { backgroundColor: cfg.color, opacity: event.isArchived ? 0.5 : 1 },
                  ]}
                >
                  <Text style={styles.markerText}>{cfg.label[0] ?? '•'}</Text>
                </View>
              </Marker>
            );
          }
          const n = item.events.length;
          return (
            <Marker
              key={item.key}
              coordinate={{ latitude: item.lat, longitude: item.lng }}
              onPress={() => setClusterPick(item.events)}
              tracksViewChanges={false}
            >
              <View
                style={[
                  styles.clusterBubble,
                  { backgroundColor: theme.primary, borderColor: theme.surface },
                ]}
              >
                <Text style={styles.clusterBubbleText}>{n}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <Modal
        visible={clusterPick != null}
        transparent
        animationType="fade"
        onRequestClose={() => setClusterPick(null)}
      >
        <View style={styles.modalWrap}>
          <TouchableOpacity
            style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.45)' }]}
            activeOpacity={1}
            onPress={() => setClusterPick(null)}
          />
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              События в этой точке
            </Text>
            <FlatList
              data={clusterPick ?? []}
              keyExtractor={(e) => e.id}
              style={{ maxHeight: 360 }}
              renderItem={({ item }) => {
                const cfg = eventTypeConfig[item.type] || eventTypeConfig.other;
                return (
                  <TouchableOpacity
                    style={[styles.clusterRow, { borderColor: theme.border }]}
                    onPress={() => {
                      setClusterPick(null);
                      onEventClick(item);
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.clusterDot, { backgroundColor: cfg.color }]} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        style={[styles.clusterRowTitle, { color: theme.text }]}
                        numberOfLines={2}
                      >
                        {item.title}
                      </Text>
                      <Text
                        style={[styles.clusterRowMeta, { color: theme.textSecondary }]}
                        numberOfLines={1}
                      >
                        {cfg.label} · {item.author}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: theme.surfaceVariant }]}
              onPress={() => setClusterPick(null)}
            >
              <Text style={[styles.modalCloseBtnText, { color: theme.text }]}>Закрыть</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View
        style={[
          styles.bottomPanel,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.border,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <View style={styles.filtersRow}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Фильтры</Text>
          {canSeeArchive ? (
            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, { color: theme.textSecondary }]}>Архив</Text>
              <Switch value={showArchived} onValueChange={setShowArchived} />
            </View>
          ) : null}
        </View>

        <FlatList
          data={Object.keys(eventTypeConfig) as EventType[]}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
          renderItem={({ item }) => {
            const cfg = eventTypeConfig[item];
            const active = filters[item];
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? cfg.color : theme.surfaceVariant,
                    borderColor: active ? cfg.color : theme.border,
                  },
                ]}
                onPress={() => toggleFilter(item)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterLabel,
                    {
                      color: active ? '#FFFFFF' : theme.text,
                      fontWeight: active ? '700' : '600',
                    },
                  ]}
                >
                  {cfg.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.actionsRow}>
          {currentUser ? (
            <TouchableOpacity
              style={[styles.mainButton, { backgroundColor: theme.primary }]}
              onPress={onCreateEvent}
              activeOpacity={0.8}
            >
              <Text style={styles.mainButtonText}>+ Создать событие</Text>
            </TouchableOpacity>
          ) : (
            <View style={[styles.infoBox, { backgroundColor: theme.warning + '20' }]}>
              <Text style={[styles.infoText, { color: theme.warning }]}>
                Авторизуйтесь, чтобы создавать события и писать в чатах.
              </Text>
            </View>
          )}

          <View style={[styles.counterBadge, { backgroundColor: theme.surfaceVariant }]}>
            <Text style={[styles.counterText, { color: theme.textSecondary }]}>
              {filteredEvents.length}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: { flex: 1 },
    header: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
      gap: 10,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      borderBottomWidth: 1,
    },
    headerTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
    headerActions: { alignItems: 'flex-end' },
    logoBadge: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
      elevation: 2,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    titleBlock: { flex: 1, minWidth: 0 },
    appTitle: { fontSize: 18, fontWeight: '800', letterSpacing: 0.3 },
    appSubtitle: { fontSize: 12, marginTop: 2 },
    headerBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    themeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    smallButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    smallButtonText: { fontSize: 13, fontWeight: '700' },
    localityBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      gap: 6,
    },
    localityText: { flex: 1, fontSize: 11, fontWeight: '600', lineHeight: 15 },
    map: { flex: 1 },
    bottomPanel: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 16,
      borderTopWidth: 1,
      elevation: 8,
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
    },
    filtersRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
      gap: 10,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700' },
    switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
    switchLabel: { fontSize: 13, fontWeight: '600' },
    filtersList: { paddingVertical: 4 },
    filterChip: {
      marginRight: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 20,
      borderWidth: 1.5,
    },
    filterLabel: { fontSize: 13 },
    actionsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 12,
    },
    mainButton: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      marginRight: 12,
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
    },
    mainButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
    infoBox: { flex: 1, padding: 12, borderRadius: 10, marginRight: 12 },
    infoText: { fontSize: 13, fontWeight: '600' },
    counterBadge: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      minWidth: 40,
      alignItems: 'center',
    },
    counterText: { fontSize: 14, fontWeight: '800' },
    markerCircle: {
      width: 34,
      height: 34,
      borderRadius: 17,
      justifyContent: 'center',
      alignItems: 'center',
      elevation: 4,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
    },
    markerText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
    clusterBubble: {
      minWidth: 36,
      minHeight: 36,
      paddingHorizontal: 8,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      elevation: 4,
    },
    clusterBubbleText: { color: '#FFFFFF', fontWeight: '900', fontSize: 15 },
    modalWrap: { flex: 1, justifyContent: 'center', padding: 20 },
    modalSheet: {
      borderRadius: 16,
      padding: 16,
      maxHeight: '80%',
      elevation: 8,
    },
    modalTitle: { fontSize: 17, fontWeight: '900', marginBottom: 12 },
    clusterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 10,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 8,
      gap: 10,
    },
    clusterDot: { width: 12, height: 12, borderRadius: 6 },
    clusterRowTitle: { fontSize: 15, fontWeight: '800' },
    clusterRowMeta: { fontSize: 12, fontWeight: '600', marginTop: 4 },
    modalCloseBtn: {
      marginTop: 8,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    modalCloseBtnText: { fontWeight: '900', fontSize: 15 },
  });
