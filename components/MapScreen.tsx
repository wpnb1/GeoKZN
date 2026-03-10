import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

import LogoMark from '@/components/LogoMark';
import { KAZAN_BOUNDS, KAZAN_CENTER } from '@/constants/map';
import { useTheme } from '@/contexts/ThemeContext';
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
  const [region, setRegion] = useState<Region>(KAZAN_CENTER);

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

          <TouchableOpacity
            style={[styles.themeButton, { backgroundColor: theme.surfaceVariant }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons name={isDark ? 'sunny' : 'moon'} size={18} color={theme.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerBottomRow}>
          {currentUser ? (
            <>
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
            <TouchableOpacity
              style={[styles.smallButton, { backgroundColor: theme.surfaceVariant }]}
              onPress={onLoginClick}
              activeOpacity={0.7}
            >
              <Text style={[styles.smallButtonText, { color: theme.text }]}>Войти</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={(r) => setRegion(clampRegion(r))}
        onLongPress={(e) => {
          const coord = (e as any)?.nativeEvent?.coordinate;
          if (coord && typeof coord.latitude === 'number' && typeof coord.longitude === 'number') {
            onMapLongPress(coord);
          }
        }}
      >
        {filteredEvents.map((event) => {
          const cfg = eventTypeConfig[event.type] || eventTypeConfig.other;
          const archivedOpacity = event.isArchived ? 0.5 : 1;
          return (
            <Marker
              key={event.id}
              coordinate={{ latitude: event.lat, longitude: event.lng }}
              title={event.title}
              description={event.description}
              onPress={() => onEventClick(event)}
            >
              <View
                style={[
                  styles.markerCircle,
                  { backgroundColor: cfg.color, opacity: archivedOpacity },
                ]}
              >
                <Text style={styles.markerText}>{cfg.label[0] ?? '•'}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

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
            <Text style={[styles.counterText, { color: theme.textSecondary }]}>{filteredEvents.length}</Text>
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
    headerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 },
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
    headerBottomRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    themeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    smallButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    smallButtonText: { fontSize: 13, fontWeight: '700' },
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
  });
