import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Image, Animated, Platform } from 'react-native';
import { setOnMascotLand, setOnMascotLeave } from '../../services/mascotBridge';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { type as T } from '../ui/tokens';

// react-native-web has no native animated module, so `useNativeDriver: true`
// logs a warning and silently falls back to the JS driver. Declaring the driver
// per platform keeps that explicit instead of relying on the fallback.
const NATIVE_DRIVER = Platform.OS !== 'web';

interface MascotGreetingProps {
  colors: any;
  agilitoLine1: string;
  agilitoLine2: string;
  onMascotClick?: () => void;
}

interface TypingTextProps {
  text: string;
  delay?: number;
  speed?: number;
  onComplete?: () => void;
  style?: any;
  startTrigger?: boolean;
}

const TypingText: React.FC<TypingTextProps> = ({
  text,
  delay = 0,
  speed = 50,
  onComplete,
  style,
  startTrigger = false,
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    setDisplayedText('');
    setComplete(false);

    if (!startTrigger) {
      return;
    }

    let currentText = '';
    let charIndex = 0;
    let intervalId: any;

    const timeoutId = setTimeout(() => {
      intervalId = setInterval(() => {
        if (charIndex < text.length) {
          currentText += text[charIndex];
          setDisplayedText(currentText);
          charIndex++;
        } else {
          clearInterval(intervalId);
          setComplete(true);
          if (onComplete) onComplete();
        }
      }, speed);
    }, delay);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, [text, delay, speed, startTrigger]);

  return <Text style={style}>{displayedText}</Text>;
};

export default function MascotGreeting({
  colors,
  agilitoLine1,
  agilitoLine2,
  onMascotClick,
}: MascotGreetingProps) {
  const [isLanded, setIsLanded] = useState(false);
  const [line1Complete, setLine1Complete] = useState(false);
  const hoverAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setIsLanded(false);
    setLine1Complete(false);

    setOnMascotLand(() => {
      setIsLanded(true);
    });

    setOnMascotLeave(() => {
      setIsLanded(false);
    });

    return () => {
      setOnMascotLand(null);
      setOnMascotLeave(null);
    };
  }, []);

  useEffect(() => {
    if (!isLanded) return;

    let hoverAnimation: Animated.CompositeAnimation | null = null;

    hoverAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(hoverAnim, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: NATIVE_DRIVER,
        }),
        Animated.timing(hoverAnim, {
          toValue: 0,
          duration: 1600,
          useNativeDriver: NATIVE_DRIVER,
        }),
      ])
    );
    hoverAnimation.start();

    return () => {
      if (hoverAnimation) {
        hoverAnimation.stop();
      }
      hoverAnim.setValue(0);
    };
  }, [isLanded]);

  return (
    <View style={[styles.flatGreetingContainer, { overflow: 'visible', position: 'relative' }]}>
      <View style={[styles.mascotImage, { backgroundColor: 'transparent', justifyContent: 'center', alignItems: 'center' }]}>
        {isLanded && (
          <Animated.View
            style={{
              transform: [
                {
                  translateY: hoverAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -6],
                  }),
                },
              ],
            }}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={onMascotClick}
            >
              <Image
                source={require('../../../assets/images/EagleMascotS5.png')}
                style={{ width: 130, height: 130, resizeMode: 'contain' }}
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {isLanded ? (
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={onMascotClick}
          style={[
            styles.greetingTextContainer,
            {
              backgroundColor: colors.card,
              borderRadius: 20,
              paddingHorizontal: 20,
              paddingVertical: 16,
              borderWidth: 1,
              borderColor: colors.cardBorder,
              position: 'relative',
              marginLeft: 12,
            }
          ]}
        >
          {/* Speech bubble arrow pointing left */}
          <View
            style={{
              position: 'absolute',
              left: -6,
              top: 28,
              width: 12,
              height: 12,
              backgroundColor: colors.card,
              transform: [{ rotate: '45deg' }],
              borderLeftWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.cardBorder,
              zIndex: 1,
            }}
          />
          <TypingText
            text={agilitoLine1}
            startTrigger={isLanded}
            speed={60}
            onComplete={() => setLine1Complete(true)}
            style={[styles.greetingUserText, { color: colors.text, ...T.titleSm }]}
          />
          <TypingText
            text={agilitoLine2}
            startTrigger={line1Complete}
            speed={40}
            style={[styles.greetingSubText, { color: colors.textSecondary, marginTop: 6, ...T.emphasis, lineHeight: 18 }]}
          />
          {line1Complete && (
            <Text style={{ ...T.caption, color: colors.textMuted, marginTop: 8 }}>
              Tap to hear more ✦
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <View style={styles.greetingTextContainer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flatGreetingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  mascotImage: {
    width: 130,
    height: 130,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingUserText: {
    fontFamily: 'Poppins-Bold',
    fontWeight: '700',
  },
  greetingSubText: {
    ...T.label,
  },
});
