import React, { useRef, useEffect } from "react";
import {
  TouchableOpacity,
  Animated,
  ViewStyle,
  TouchableOpacityProps,
  Easing,
} from "react-native";
import { lightHaptic } from "../utils/haptics";

interface AnimatedButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  scaleValue?: number;
  haptic?: boolean;
}

export function AnimatedButton({
  children,
  style,
  onPress,
  scaleValue = 0.95,
  haptic = true,
  ...props
}: AnimatedButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = (e: any) => {
    if (haptic) lightHaptic();
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      activeOpacity={1}
      {...props}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

interface FadeInViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  delay?: number;
  duration?: number;
}

export function FadeInView({
  children,
  style,
  delay = 0,
  duration = 300,
}: FadeInViewProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  }, [fadeAnim, translateY, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface SlideInViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  direction?: "left" | "right" | "top" | "bottom";
  delay?: number;
  duration?: number;
}

export function SlideInView({
  children,
  style,
  direction = "right",
  delay = 0,
  duration = 400,
}: SlideInViewProps) {
  const translateAnim = useRef(
    new Animated.Value(getInitialValue(direction))
  ).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  function getInitialValue(dir: string) {
    switch (dir) {
      case "left":
        return -50;
      case "right":
        return 50;
      case "top":
        return -50;
      case "bottom":
        return 50;
      default:
        return 50;
    }
  }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateAnim, {
        toValue: 0,
        duration,
        delay,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2)),
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: duration * 0.7,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateAnim, opacityAnim, delay, duration]);

  const transform =
    direction === "left" || direction === "right"
      ? [{ translateX: translateAnim }]
      : [{ translateY: translateAnim }];

  return (
    <Animated.View style={[style, { opacity: opacityAnim, transform }]}>
      {children}
    </Animated.View>
  );
}

interface ScaleInViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  delay?: number;
  duration?: number;
}

export function ScaleInView({
  children,
  style,
  delay = 0,
  duration = 300,
}: ScaleInViewProps) {
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scaleAnim, opacityAnim, delay, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface PulseViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  active?: boolean;
}

export function PulseView({ children, style, active = true }: PulseViewProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (active) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [pulseAnim, active]);

  return (
    <Animated.View style={[style, { transform: [{ scale: pulseAnim }] }]}>
      {children}
    </Animated.View>
  );
}

interface BounceViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  trigger?: any;
}

export function BounceView({ children, style, trigger }: BounceViewProps) {
  const bounceAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (trigger !== undefined) {
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(bounceAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 200,
          friction: 5,
        }),
      ]).start();
    }
  }, [trigger, bounceAnim]);

  return (
    <Animated.View style={[style, { transform: [{ scale: bounceAnim }] }]}>
      {children}
    </Animated.View>
  );
}

interface ShakeViewProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  trigger?: any;
}

export function ShakeView({ children, style, trigger }: ShakeViewProps) {
  const shakeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger !== undefined) {
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: -10,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [trigger, shakeAnim]);

  return (
    <Animated.View style={[style, { transform: [{ translateX: shakeAnim }] }]}>
      {children}
    </Animated.View>
  );
}
