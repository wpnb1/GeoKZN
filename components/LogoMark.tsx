import React from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  size?: number;
  color?: string;
  accent?: string;
};

export default function LogoMark({
  size = 44,
  color = "#1976D2",
  accent = "#FFFFFF",
}: Props) {
  const styles = createStyles(size, color, accent);
  return (
    <View style={styles.wrap}>
      <View style={styles.head} />
      <View style={styles.tail} />
      <View style={styles.dot} />
    </View>
  );
}

const createStyles = (size: number, color: string, accent: string) =>
  StyleSheet.create({
    wrap: {
      width: size,
      height: size,
      alignItems: "center",
      justifyContent: "flex-start",
    },
    head: {
      width: size * 0.72,
      height: size * 0.72,
      borderRadius: Math.round(size * 0.36),
      backgroundColor: color,
    },
    tail: {
      marginTop: -size * 0.08,
      width: 0,
      height: 0,
      borderLeftWidth: size * 0.18,
      borderRightWidth: size * 0.18,
      borderTopWidth: size * 0.28,
      borderLeftColor: "transparent",
      borderRightColor: "transparent",
      borderTopColor: color,
    },
    dot: {
      position: "absolute",
      top: size * 0.22,
      width: size * 0.22,
      height: size * 0.22,
      borderRadius: Math.round(size * 0.11),
      backgroundColor: accent,
      opacity: 0.95,
    },
  });

