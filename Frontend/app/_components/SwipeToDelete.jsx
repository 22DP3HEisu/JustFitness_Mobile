import i18n from "../../lib/i18n";
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, { runOnJS, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
const DEFAULT_ACTION_WIDTH = 88;
const DEFAULT_THRESHOLD = -160;
const SwipeDeleteAction = ({
  translation,
  onPress,
  onFullSwipe,
  actionWidth,
  threshold,
  showLabel,
  iconSize
}) => {
  const backdropStyle = useAnimatedStyle(() => ({
    width: Math.abs(translation.value)
  }));
  const buttonRevealStyle = useAnimatedStyle(() => ({
    width: Math.min(Math.abs(translation.value), actionWidth)
  }));
  useAnimatedReaction(() => translation.value <= threshold, (isPastThreshold, wasPastThreshold) => {
    if (isPastThreshold !== wasPastThreshold) {
      runOnJS(onFullSwipe)(isPastThreshold);
    }
  }, [onFullSwipe, threshold]);
  return <View style={[styles.measure, {
    width: actionWidth
  }]}>
      <Reanimated.View pointerEvents="none" style={[styles.backdrop, backdropStyle]} />
      <Reanimated.View style={[styles.buttonReveal, buttonRevealStyle]}>
        <TouchableOpacity style={[styles.button, {
        width: actionWidth
      }]} onPress={onPress} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={iconSize} color="#FFFFFF" />
          {showLabel ? <Text style={styles.label}>{i18n.t("ui.delete")}</Text> : null}
        </TouchableOpacity>
      </Reanimated.View>
    </View>;
};
const SwipeToDelete = ({
  children,
  onDelete,
  onFullSwipeDelete,
  actionWidth = DEFAULT_ACTION_WIDTH,
  threshold = DEFAULT_THRESHOLD,
  rightThreshold = Math.max(24, actionWidth / 2),
  containerStyle,
  enabled = true,
  showLabel = false,
  iconSize = 20
}) => {
  const swipeableRef = useRef(null);
  const deleteTriggeredRef = useRef(false);
  const fullSwipeReadyRef = useRef(false);
  const close = () => {
    swipeableRef.current?.close();
  };
  const renderChildren = () => typeof children === 'function' ? children({
    close
  }) : children;
  const handleDeletePress = () => {
    if (!enabled) return;
    deleteTriggeredRef.current = true;
    fullSwipeReadyRef.current = false;
    close();
    onDelete?.();
  };
  const handleSwipeOpen = direction => {
    if (!enabled || direction !== 'left' || deleteTriggeredRef.current) return;
    if (!fullSwipeReadyRef.current) return;
    deleteTriggeredRef.current = true;
    fullSwipeReadyRef.current = false;
    (onFullSwipeDelete || onDelete)?.();
  };
  const handleSwipeClose = () => {
    deleteTriggeredRef.current = false;
    fullSwipeReadyRef.current = false;
  };
  const markFullSwipeReady = isReady => {
    fullSwipeReadyRef.current = isReady;
  };
  const renderRightActions = (progress, translation) => <SwipeDeleteAction translation={translation} onPress={handleDeletePress} onFullSwipe={markFullSwipeReady} actionWidth={actionWidth} threshold={threshold} showLabel={showLabel} iconSize={iconSize} />;
  if (!enabled) {
    return renderChildren();
  }
  return <Swipeable ref={swipeableRef} friction={1} rightThreshold={rightThreshold} overshootRight overshootFriction={1} renderRightActions={renderRightActions} containerStyle={containerStyle} onSwipeableOpen={handleSwipeOpen} onSwipeableClose={handleSwipeClose}>
      {renderChildren()}
    </Swipeable>;
};
export default SwipeToDelete;
const styles = StyleSheet.create({
  measure: {
    height: '100%'
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF6B6B'
  },
  buttonReveal: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    alignItems: 'flex-end'
  },
  button: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: 'transparent'
  },
  label: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  }
});
