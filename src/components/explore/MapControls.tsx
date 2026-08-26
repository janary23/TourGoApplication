import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface MapControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onLocate: () => void;
  onShare: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ onZoomIn, onZoomOut, onReset, onLocate, onShare }) => {
  const { colors } = useTheme();

  const renderButton = (icon: keyof typeof Ionicons.glyphMap, onPress: () => void, isLast = false) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        pressed && { backgroundColor: colors.surface },
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.cardBorder },
      ]}
    >
      <Ionicons name={icon} size={16} color={colors.text} />
    </Pressable>
  );

  return (
    <View style={[styles.capsule, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      {renderButton('add', onZoomIn)}
      {renderButton('remove', onZoomOut)}
      {renderButton('compass-outline', onReset)}
      {renderButton('locate-outline', onLocate)}
      {renderButton('share-social-outline', onShare, true)}
    </View>
  );
};

const styles = StyleSheet.create({
  capsule: {
    position: 'absolute',
    right: 12,
    top: 90,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  btn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
