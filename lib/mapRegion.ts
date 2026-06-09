import type { Region } from 'react-native-maps';

const REGION_EPSILON = 0.0005;

export function hasMeaningfulRegionChange(current: Region, next: Region) {
  return (
    Math.abs(current.latitude - next.latitude) > REGION_EPSILON ||
    Math.abs(current.longitude - next.longitude) > REGION_EPSILON ||
    Math.abs(current.latitudeDelta - next.latitudeDelta) > REGION_EPSILON ||
    Math.abs(current.longitudeDelta - next.longitudeDelta) > REGION_EPSILON
  );
}
