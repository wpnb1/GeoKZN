import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import type MapView from 'react-native-maps';
import type { Region } from 'react-native-maps';

import { KAZAN_BOUNDS } from '@/constants/map';
import { hasMeaningfulRegionChange } from '@/lib/mapRegion';

export function clampMapRegion(region: Region): Region {
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

export function clampMapCoord(coord: { latitude: number; longitude: number }) {
  return {
    latitude: Math.min(Math.max(coord.latitude, KAZAN_BOUNDS.minLat), KAZAN_BOUNDS.maxLat),
    longitude: Math.min(Math.max(coord.longitude, KAZAN_BOUNDS.minLng), KAZAN_BOUNDS.maxLng),
  };
}

export function useBoundedMapRegion(initialRegion: Region) {
  const mapRef = useRef<MapView | null>(null);
  const latestRegionRef = useRef<Region>(initialRegion);
  const isCorrectingRegionRef = useRef(false);
  const correctionTaskRef = useRef<{ cancel?: () => void } | null>(null);
  const pendingRegionCorrectionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [region, setRegion] = useState<Region>(initialRegion);

  const clearPendingRegionCorrection = () => {
    if (pendingRegionCorrectionRef.current) {
      clearTimeout(pendingRegionCorrectionRef.current);
      pendingRegionCorrectionRef.current = null;
    }
    correctionTaskRef.current?.cancel?.();
    correctionTaskRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearPendingRegionCorrection();
    };
  }, []);

  const handleMapPanDrag = () => {
    clearPendingRegionCorrection();
    isCorrectingRegionRef.current = false;
  };

  const scheduleRegionCorrection = () => {
    clearPendingRegionCorrection();
    pendingRegionCorrectionRef.current = setTimeout(() => {
      pendingRegionCorrectionRef.current = null;
      correctionTaskRef.current = InteractionManager.runAfterInteractions(() => {
        correctionTaskRef.current = null;
        const clamped = clampMapRegion(latestRegionRef.current);
        if (!hasMeaningfulRegionChange(latestRegionRef.current, clamped)) return;
        isCorrectingRegionRef.current = true;
        mapRef.current?.animateToRegion(clamped, 180);
      });
    }, 260);
  };

  const handleRegionChangeComplete = (nextRegion: Region) => {
    latestRegionRef.current = nextRegion;
    const clamped = clampMapRegion(nextRegion);
    setRegion((current) =>
      hasMeaningfulRegionChange(current, clamped) ? clamped : current,
    );

    if (isCorrectingRegionRef.current) {
      isCorrectingRegionRef.current = false;
      return;
    }

    if (!hasMeaningfulRegionChange(nextRegion, clamped)) return;
    scheduleRegionCorrection();
  };

  return {
    mapRef,
    region,
    handleMapPanDrag,
    handleRegionChangeComplete,
  };
}
