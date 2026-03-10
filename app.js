import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

// Примерный центр Казани
const KAZAN_CENTER = {
  latitude: 55.796289,
  longitude: 49.108795,
  latitudeDelta: 0.15,
  longitudeDelta: 0.25,
};

// Примерные границы города
const KAZAN_BOUNDS = {
  minLat: 55.6,
  maxLat: 56.0,
  minLng: 48.9,
  maxLng: 49.4,
};

// Мок-события для демонстрации
const MOCK_EVENTS = [
  {
    id: 1,
    title: 'ДТП на Амирхана',
    type: 'ACCIDENT',
    description: 'Лёгкое столкновение, небольшая пробка в сторону центра.',
    latitude: 55.823,
    longitude: 49.148,
  },
  {
    id: 2,
    title: 'Пост ДПС',
    type: 'DPS',
    description: 'Проверяют документы и ремни безопасности.',
    latitude: 55.788,
    longitude: 49.104,
  },
  {
    id: 3,
    title: 'Камера контроля скорости',
    type: 'CAMERA',
    description: 'Ограничение 60 км/ч, много штрафов.',
    latitude: 55.78,
    longitude: 49.122,
  },
  {
    id: 4,
    title: 'Обсуждение района Азино',
    type: 'CHAT',
    description: 'Чат жителей по вопросам парковки и шума.',
    latitude: 55.827,
    longitude: 49.151,
  },
  {
    id: 5,
    title: 'Городское мероприятие',
    type: 'ACTIVITY',
    description: 'Фестиваль у Кремля, много людей.',
    latitude: 55.799,
    longitude: 49.106,
  },
];

// Ограничиваем регион только Казанью
function clampRegion(region) {
  let { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  if (latitude < KAZAN_BOUNDS.minLat) {
    latitude = KAZAN_BOUNDS.minLat;
  } else if (latitude > KAZAN_BOUNDS.maxLat) {
    latitude = KAZAN_BOUNDS.maxLat;
  }

  if (longitude < KAZAN_BOUNDS.minLng) {
    longitude = KAZAN_BOUNDS.minLng;
  } else if (longitude > KAZAN_BOUNDS.maxLng) {
    longitude = KAZAN_BOUNDS.maxLng;
  }

  const minDelta = 0.02;
  const maxDelta = 0.6;

  latitudeDelta = Math.min(Math.max(latitudeDelta, minDelta), maxDelta);
  longitudeDelta = Math.min(Math.max(longitudeDelta, minDelta), maxDelta);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

export default function App() {
  const [region, setRegion] = useState(KAZAN_CENTER);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setIsLoadingLocation(false);
          return;
        }

        const current = await Location.getCurrentPositionAsync({});
        const userRegion = {
          latitude: current.coords.latitude,
          longitude: current.coords.longitude,
          latitudeDelta: 0.15,
          longitudeDelta: 0.25,
        };

        setRegion(clampRegion(userRegion));
      } catch (e) {
        // В случае ошибки оставляем дефолтный центр Казани
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, []);

  if (isLoadingLocation) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loaderText}>Загрузка карты Казани…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>GeoMessenger — Казань</Text>
        <Text style={styles.subtitle}>Демо: события только в пределах города</Text>
      </View>

      <MapView
        style={styles.map}
        initialRegion={region}
        region={region}
        onRegionChangeComplete={(r) => setRegion(clampRegion(r))}
      >
        {MOCK_EVENTS.map((event) => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            title={event.title}
            description={event.description}
            onPress={() => {
              setSelectedEvent(event);
              setIsChatOpen(false);
            }}
          />
        ))}
      </MapView>

      <Modal
        visible={!!selectedEvent}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedEvent(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {selectedEvent && !isChatOpen && (
              <>
                <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
                <Text style={styles.modalType}>Тип: {selectedEvent.type}</Text>
                <Text style={styles.modalDescription}>{selectedEvent.description}</Text>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.chatButton]}
                    onPress={() => setIsChatOpen(true)}
                  >
                    <Text style={styles.buttonText}>Открыть чат события</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.button, styles.closeButton]}
                    onPress={() => setSelectedEvent(null)}
                  >
                    <Text style={styles.buttonText}>Закрыть</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {selectedEvent && isChatOpen && (
              <>
                <Text style={styles.modalTitle}>Чат события</Text>
                <Text style={styles.modalSubtitle}>
                  (демо-заглушка, сюда позже подключается реальный чат)
                </Text>
                <View style={styles.chatPlaceholder}>
                  <Text style={styles.chatPlaceholderText}>
                    Здесь будет лента комментариев, привязанных к этому событию.
                  </Text>
                </View>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.button, styles.backButton]}
                    onPress={() => setIsChatOpen(false)}
                  >
                    <Text style={styles.buttonText}>К информации о событии</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.button, styles.closeButton]}
                    onPress={() => setSelectedEvent(null)}
                  >
                    <Text style={styles.buttonText}>Закрыть</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ecf0f1',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 32 : 0,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#dcdde1',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2c3e50',
  },
  subtitle: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecf0f1',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#7f8c8d',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    minHeight: 260,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 4,
  },
  modalType: {
    fontSize: 13,
    color: '#8e44ad',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 16,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'column',
    gap: 8,
    marginTop: 8,
  },
  button: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  chatButton: {
    backgroundColor: '#3498db',
  },
  closeButton: {
    backgroundColor: '#95a5a6',
  },
  backButton: {
    backgroundColor: '#9b59b6',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  chatPlaceholder: {
    borderWidth: 1,
    borderColor: '#dcdde1',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    justifyContent: 'center',
  },
  chatPlaceholderText: {
    fontSize: 13,
    color: '#7f8c8d',
  },
});