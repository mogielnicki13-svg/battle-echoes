// ============================================================
// BATTLE ECHOES — AvatarDisplay.tsx
// Renders a user avatar consistently across the app.
// Shows portrait image if available, otherwise a styled
// fallback with era color + commander initials + icon.
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ERA_THEMES } from '../constants/theme';
import { getAvatar, AVATAR_RARITY_COLORS, type Avatar } from '../avatars/data';

interface Props {
  avatarId: string;
  size?: number;
  style?: ViewStyle;
  showBorder?: boolean;
}

export default function AvatarDisplay({
  avatarId,
  size = 64,
  style,
  showBorder = true,
}: Props) {
  const avatar = getAvatar(avatarId);
  const eraTheme = ERA_THEMES[avatar.era] ?? ERA_THEMES.medieval;
  const rarityColor = AVATAR_RARITY_COLORS[avatar.rarity];
  const borderColor = showBorder ? rarityColor : 'transparent';

  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: showBorder ? Math.max(2, size / 20) : 0,
    borderColor,
    backgroundColor: eraTheme.primary + '30',
    overflow: 'hidden',
  };

  // If image exists, show it
  if (avatar.image) {
    return (
      <View style={[containerStyle, style]}>
        <Image
          source={avatar.image}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // Styled fallback: era-colored circle with icon + initials
  const iconSize = Math.round(size * 0.35);
  const initialsSize = Math.round(size * 0.18);

  return (
    <View style={[containerStyle, styles.fallback, style]}>
      <MaterialCommunityIcons
        name={avatar.icon as any}
        size={iconSize}
        color={eraTheme.primary}
        style={{ opacity: 0.9 }}
      />
      <Text
        style={[
          styles.initials,
          {
            fontSize: initialsSize,
            color: eraTheme.primary,
          },
        ]}
        numberOfLines={1}
      >
        {avatar.initials}
      </Text>
    </View>
  );
}

// ── Compact version for lists ────────────────────────────
export function AvatarSmall({
  avatarId,
  size = 36,
  style,
}: {
  avatarId: string;
  size?: number;
  style?: ViewStyle;
}) {
  return <AvatarDisplay avatarId={avatarId} size={size} style={style} showBorder />;
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  initials: {
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
