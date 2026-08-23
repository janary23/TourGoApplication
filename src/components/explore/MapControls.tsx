import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLocate: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ onZoomIn, onZoomOut, onReset, onLocate }) => {
  const { colors } = useTheme();

  const button = (icon: keyof typeof Ionicons.glyphMap, onPress: () => void, color?: string) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: colors.card, borderColor: colors.cardBorder },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name={icon} size={18} color={color ?? colors.text} />
    </Pressable>
  );

  return (
    <View style={styles.stack}>
      {button('add', onZoomIn)}
      {button('remove', onZoomOut)}
      {button('compass-outline', onReset, colors.text)}
      {button('locate-outline', onLocate, colors.text)}
    </View>
  );
};

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    right: 16,
    top: 120,
  },
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
});