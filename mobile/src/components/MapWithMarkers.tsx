import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

type MarkerType = "self" | "target" | "aed" | "peer";

const markerColors: Record<MarkerType, string> = {
  self: "#2563EB",
  target: "#DC2626",
  aed: "#16A34A",
  peer: "#F59E0B",
};

export type MapWithMarkersProps = {
  center: { lat: number; lng: number };
  markers: Array<{
    id: string;
    lat: number;
    lng: number;
    type: MarkerType;
    label?: string;
  }>;
  height?: number;
  routeTo?: { lat: number; lng: number };
};

export default function MapWithMarkers({
  center,
  markers,
  height = 300,
  routeTo,
}: MapWithMarkersProps): JSX.Element {
  const initialRegion = useMemo(() => {
    const lats = [center.lat, ...(routeTo ? [routeTo.lat] : [])];
    const lngs = [center.lng, ...(routeTo ? [routeTo.lng] : [])];
    const latSpan = Math.max(...lats) - Math.min(...lats);
    const lngSpan = Math.max(...lngs) - Math.min(...lngs);

    return {
      latitude: center.lat,
      longitude: center.lng,
      latitudeDelta: Math.max(0.01, latSpan * 2 || 0.01),
      longitudeDelta: Math.max(0.01, lngSpan * 2 || 0.01),
    };
  }, [center.lat, center.lng, routeTo]);

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        followsUserLocation
        initialRegion={initialRegion}
        loadingEnabled
        showsUserLocation
        style={StyleSheet.absoluteFill}
      >
        {markers.map((marker) => (
          <Marker
            coordinate={{ latitude: marker.lat, longitude: marker.lng }}
            key={marker.id}
            pinColor={markerColors[marker.type]}
            title={marker.label}
          />
        ))}
        {routeTo ? (
          <Polyline
            coordinates={[
              { latitude: center.lat, longitude: center.lng },
              { latitude: routeTo.lat, longitude: routeTo.lng },
            ]}
            strokeColor={markerColors.target}
            strokeWidth={4}
          />
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    borderRadius: 16,
  },
});
