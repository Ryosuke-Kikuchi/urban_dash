import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler, State } from 'react-native-gesture-handler';

interface FloatingButtonProps {
  onPress: () => void;
  size?: number;
  opacity?: number;
  initialPosition?: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
  isVisible?: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const FloatingButton: React.FC<FloatingButtonProps> = ({
  onPress,
  size = 60,
  opacity = 0.8,
  initialPosition = { x: 50, y: 200 },
  onPositionChange,
  isVisible = true,
}) => {
  const translateX = useRef(new Animated.Value(initialPosition.x)).current;
  const translateY = useRef(new Animated.Value(initialPosition.y)).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  const [isDragging, setIsDragging] = useState(false);
  const lastOffset = useRef({ x: initialPosition.x, y: initialPosition.y });

  const onGestureEvent = Animated.event(
    [
      {
        nativeEvent: {
          translationX: translateX,
          translationY: translateY,
        },
      },
    ],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    const { state, translationX, translationY } = event.nativeEvent;

    if (state === State.BEGAN) {
      setIsDragging(true);
      // ドラッグ開始時にボタンを少し小さくする
      Animated.spring(scale, {
        toValue: 0.9,
        useNativeDriver: false,
      }).start();
    } else if (state === State.END || state === State.CANCELLED) {
      setIsDragging(false);
      
      // ドラッグ終了時にボタンサイズを元に戻す
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: false,
      }).start();

      // 新しい位置を計算
      const newX = lastOffset.current.x + translationX;
      const newY = lastOffset.current.y + translationY;

      // 画面境界内に収める
      const boundedX = Math.max(0, Math.min(screenWidth - size, newX));
      const boundedY = Math.max(50, Math.min(screenHeight - size - 50, newY));

      // 位置を更新
      lastOffset.current = { x: boundedX, y: boundedY };
      
      // アニメーションで最終位置に移動
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: boundedX,
          useNativeDriver: false,
        }),
        Animated.spring(translateY, {
          toValue: boundedY,
          useNativeDriver: false,
        }),
      ]).start();

      // 位置変更をコールバック
      if (onPositionChange) {
        onPositionChange({ x: boundedX, y: boundedY });
      }

      // リセット用の値を更新
      translateX.setOffset(boundedX);
      translateY.setOffset(boundedY);
      translateX.setValue(0);
      translateY.setValue(0);
    }
  };

  const handlePress = () => {
    if (!isDragging) {
      onPress();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <GestureHandlerRootView style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.container,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: opacity,
              transform: [
                { translateX: translateX },
                { translateY: translateY },
                { scale: scale },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.button, { width: size, height: size, borderRadius: size / 2 }]}
            onPress={handlePress}
            activeOpacity={0.8}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>+</Text>
            </View>
            <Text style={styles.label}>案件</Text>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  button: {
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  iconContainer: {
    marginBottom: 2,
  },
  icon: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default FloatingButton; 