// ============================================================
// BATTLE ECHOES — AccessibilitySettings.tsx
// Panel ustawień dostępności (do ProfileScreen)
// ============================================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch } from 'react-native';
import { Colors, Radius } from '../constants/theme';
import { useAccessibility, FONT_SCALE_PRESETS } from '../hooks/useAccessibility';
import { Icon } from './GoldIcon';
import { useTranslation } from 'react-i18next';

export default function AccessibilitySettingsCard() {
  const { t } = useTranslation();
  const { settings, setFontScale, setReduceMotion, setHighContrast } = useAccessibility();

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{t('accessibility.title')}</Text>

      {/* Font size */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon id="font_size" size={16} color={Colors.textSecondary} />
          <Text style={styles.sectionTitle}>{t('accessibility.font_size')}</Text>
        </View>
        <View style={styles.scaleRow}>
          {FONT_SCALE_PRESETS.map(preset => {
            const isActive = Math.abs(settings.fontScale - preset.value) < 0.01;
            return (
              <TouchableOpacity
                key={preset.label}
                style={[styles.scalePill, isActive && styles.scalePillActive]}
                onPress={() => setFontScale(preset.value)}
                accessibilityLabel={preset.labelPL}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <Text style={[
                  styles.scalePillText,
                  isActive && styles.scalePillTextActive,
                  { fontSize: 11 * preset.value },
                ]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.previewText} accessibilityLabel={t('accessibility.preview')}>
          <Text style={{ fontSize: 14 * settings.fontScale }}>
            Aa — {t('accessibility.sample_text')}
          </Text>
        </Text>
      </View>

      {/* Reduce motion */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>{t('accessibility.reduce_motion')}</Text>
          <Text style={styles.toggleSub}>{t('accessibility.reduce_motion_hint')}</Text>
        </View>
        <Switch
          value={settings.reduceMotion}
          onValueChange={setReduceMotion}
          trackColor={{ false: Colors.borderDefault, true: `${Colors.gold}60` }}
          thumbColor={settings.reduceMotion ? Colors.gold : Colors.textMuted}
          accessibilityLabel={t('accessibility.reduce_motion')}
        />
      </View>

      {/* High contrast */}
      <View style={styles.toggleRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.toggleTitle}>{t('accessibility.high_contrast')}</Text>
          <Text style={styles.toggleSub}>{t('accessibility.high_contrast_hint')}</Text>
        </View>
        <Switch
          value={settings.highContrast}
          onValueChange={setHighContrast}
          trackColor={{ false: Colors.borderDefault, true: `${Colors.gold}60` }}
          thumbColor={settings.highContrast ? Colors.gold : Colors.textMuted}
          accessibilityLabel={t('accessibility.high_contrast')}
        />
      </View>

      {/* Screen reader status */}
      {settings.screenReaderActive && (
        <View style={styles.readerBadge}>
          <Icon id="check_solid" size={14} color="#4ade80" style={{ marginRight: 6 }} />
          <Text style={styles.readerText}>{t('accessibility.screen_reader_active')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: Radius.md,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  cardLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 1.5,
    fontWeight: '600',
  },
  section: { gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  scaleRow: { flexDirection: 'row', gap: 6 },
  scalePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    backgroundColor: Colors.backgroundElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  scalePillActive: {
    backgroundColor: `${Colors.gold}20`,
    borderColor: Colors.gold,
  },
  scalePillText: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  scalePillTextActive: {
    color: Colors.gold,
  },
  previewText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleTitle: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  toggleSub: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  readerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74,222,128,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.2)',
  },
  readerText: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
  },
});
