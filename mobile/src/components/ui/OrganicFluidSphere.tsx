import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  ViewStyle,
  Image,
  ImageSourcePropType,
  AccessibilityInfo,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, withAlpha } from '../../theme';

export type SphereState = 'idle' | 'recording' | 'thinking';

export interface OrganicFluidSphereProps {
  state?: SphereState;
  size?: number;
  imageSource?: ImageSourcePropType | null;
  style?: ViewStyle;
  active?: boolean;
}

export const OrganicFluidSphere: React.FC<OrganicFluidSphereProps> = ({
  state = 'idle',
  size = 160,
  imageSource = null,
  style,
  active = true,
}) => {
  // Fluid non-uniform squish-and-stretch
  const squishX = useRef(new Animated.Value(1)).current;
  const squishY = useRef(new Animated.Value(1)).current;

  // Expanding acoustic halo ripples
  const haloScale1 = useRef(new Animated.Value(1)).current;
  const haloOpacity1 = useRef(new Animated.Value(0.4)).current;
  const haloScale2 = useRef(new Animated.Value(1)).current;
  const haloOpacity2 = useRef(new Animated.Value(0.3)).current;

  // Specular drift
  const specularOffset = useRef(new Animated.Value(0)).current;

  // Reduced-motion handling: users with the OS "reduce motion" setting get a
  // static sphere instead of four infinite concurrent loops.
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    if (!active || reduceMotion) return;

    // Cadence speeds based on state
    const duration =
      state === 'recording' ? 900 : state === 'thinking' ? 1400 : 2600;

    // 1. Organic squish & stretch oscillation
    const squishLoop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(squishX, {
            toValue: state === 'recording' ? 1.09 : 1.04,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
          Animated.timing(squishY, {
            toValue: state === 'recording' ? 0.93 : 0.97,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(squishX, {
            toValue: state === 'recording' ? 0.94 : 0.97,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
          Animated.timing(squishY, {
            toValue: state === 'recording' ? 1.08 : 1.03,
            duration: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 2. Acoustic Halo 1
    const halo1Loop = Animated.loop(
      Animated.parallel([
        Animated.timing(haloScale1, {
          toValue: state === 'recording' ? 1.75 : 1.35,
          duration: duration,
          useNativeDriver: true,
        }),
        Animated.timing(haloOpacity1, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Acoustic Halo 2 (Phase offset)
    const halo2Loop = Animated.loop(
      Animated.sequence([
        Animated.delay(duration * 0.4),
        Animated.parallel([
          Animated.timing(haloScale2, {
            toValue: state === 'recording' ? 1.95 : 1.5,
            duration: duration * 0.9,
            useNativeDriver: true,
          }),
          Animated.timing(haloOpacity2, {
            toValue: 0,
            duration: duration * 0.9,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    // 4. Specular highlight drift
    const specularLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(specularOffset, {
          toValue: 8,
          duration: duration * 0.7,
          useNativeDriver: true,
        }),
        Animated.timing(specularOffset, {
          toValue: -8,
          duration: duration * 0.7,
          useNativeDriver: true,
        }),
      ])
    );

    squishLoop.start();
    halo1Loop.start();
    halo2Loop.start();
    specularLoop.start();

    return () => {
      squishLoop.stop();
      halo1Loop.stop();
      halo2Loop.stop();
      specularLoop.stop();
      squishX.setValue(1);
      squishY.setValue(1);
      haloScale1.setValue(1);
      haloOpacity1.setValue(0.4);
      haloScale2.setValue(1);
      haloOpacity2.setValue(0.3);
      specularOffset.setValue(0);
    };
  }, [
    active,
    reduceMotion,
    state,
    squishX,
    squishY,
    haloScale1,
    haloOpacity1,
    haloScale2,
    haloOpacity2,
    specularOffset,
  ]);

  // Color theme presets according to state
  const haloColor =
    state === 'recording'
      ? withAlpha(theme.colors.palette.coralCoast, 0.45)
      : state === 'thinking'
      ? withAlpha(theme.colors.palette.petroBlue, 0.4)
      : withAlpha(theme.colors.palette.blissfulBlue, 0.25);

  const gradientColors =
    state === 'recording'
      ? [theme.colors.palette.coralCoast, theme.colors.primary.main, theme.colors.palette.petroBlue]
      : state === 'thinking'
      ? [theme.colors.palette.petroBlue, theme.colors.palette.eliteTeal, theme.colors.palette.darkSideMoon]
      : [theme.colors.palette.coralCoast, theme.colors.palette.petroBlue, theme.colors.palette.eliteTeal];

  return (
    <View style={[styles.rootContainer, { width: size * 1.8, height: size * 1.8 }, style]}>
      {/* Halo 2 (Outer Ripple) */}
      <Animated.View
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: haloColor,
            borderWidth: 2,
            transform: [{ scale: haloScale2 }],
            opacity: haloOpacity2,
          },
        ]}
      />

      {/* Halo 1 (Inner Ripple) */}
      <Animated.View
        style={[
          styles.halo,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: haloColor,
            transform: [{ scale: haloScale1 }],
            opacity: haloOpacity1,
          },
        ]}
      />

      {/* Main Living 3D Organic Fluid Sphere */}
      <Animated.View
        style={[
          styles.coreSphere,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scaleX: squishX }, { scaleY: squishY }],
          },
          theme.spatial.shadows3d.floating3d,
        ]}
      >
        {imageSource ? (
          <Image
            source={imageSource}
            style={[styles.innerImage, { width: size, height: size, borderRadius: size / 2 }]}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={gradientColors as [string, string, ...string[]]}
            start={{ x: 0.15, y: 0.15 }}
            end={{ x: 0.85, y: 0.85 }}
            style={[styles.innerGradient, { width: size, height: size, borderRadius: size / 2 }]}
          />
        )}

        {/* Specular curved reflection highlight */}
        <Animated.View
          style={[
            styles.specularHighlight,
            {
              width: size * 0.45,
              height: size * 0.22,
              borderRadius: size * 0.22,
              transform: [{ translateX: specularOffset }],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  halo: {
    position: 'absolute',
  },
  coreSphere: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  innerImage: {
    width: '100%',
    height: '100%',
  },
  innerGradient: {
    width: '100%',
    height: '100%',
  },
  specularHighlight: {
    position: 'absolute',
    top: '12%',
    left: '18%',
    backgroundColor: withAlpha(theme.colors.ramp.white, 0.35),
  },
});
