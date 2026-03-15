// ============================================================
// BATTLE ECHOES — CampaignBanner.tsx
//
// CTA wyświetlany gdy zablokowana bitwa należy do pakietu kampanii.
// Używany w: BattleDetailScreen (overlay) + MapScreen (LockedBattleSheet).
// ============================================================
import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import GoldIcon from './GoldIcon';
import { DucatIcon } from './GoldIcon';
import { type Campaign, campaignSavePercent } from '../campaigns/data';
import { Colors } from '../constants/theme';

// ── Typy ─────────────────────────────────────────────────────
export interface CampaignBannerProps {
  campaign:      Campaign;
  userCoins:     number;
  battleName:    string;     // nazwa bitwy kontekstowej ("Ta bitwa...")
  onPurchase:    () => void;
  onDismiss?:    () => void; // opcjonalny X w BattleDetail
  compact?:      boolean;    // true = wersja inline (MapScreen sheet)
}

// ════════════════════════════════════════════════════════════
// PEŁNA WERSJA (BattleDetailScreen)
// ════════════════════════════════════════════════════════════
export default function CampaignBanner({
  campaign, userCoins, battleName, onPurchase, onDismiss, compact = false,
}: CampaignBannerProps) {
  if (compact) {
    return (
      <CompactCampaignBanner
        campaign={campaign}
        userCoins={userCoins}
        onPurchase={onPurchase}
      />
    );
  }

  return (
    <FullCampaignBanner
      campaign={campaign}
      userCoins={userCoins}
      battleName={battleName}
      onPurchase={onPurchase}
      onDismiss={onDismiss}
    />
  );
}

// ── Pełna wersja ──────────────────────────────────────────────
function FullCampaignBanner({
  campaign, userCoins, battleName, onPurchase, onDismiss,
}: Omit<CampaignBannerProps, 'compact'>) {
  const { t } = useTranslation();
  const slideAnim = useRef(new Animated.Value(40)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 60, friction: 14, useNativeDriver: true }),
    ]).start();
  }, []);

  const canAfford   = userCoins >= campaign.price;
  const savePercent = campaignSavePercent(campaign);
  const color       = campaign.accentColor;

  return (
    <Animated.View style={[
      styles.fullWrap,
      { borderColor: color, opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
    ]}>
      {/* Zamknij */}
      {onDismiss && (
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <GoldIcon name="close" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
      )}

      {/* Nagłówek */}
      <View style={styles.fullHeader}>
        <View style={[styles.badgeCircle, { backgroundColor: `${color}20`, borderColor: `${color}50` }]}>
          <GoldIcon name={campaign.badgeIcon} size={22} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.packLabel}>{t('campaign.pack_label')}</Text>
          <Text style={[styles.campaignName, { color }]}>{campaign.name}</Text>
          <Text style={styles.tagline}>{campaign.tagline}</Text>
        </View>
      </View>

      {/* Kontekst bitwy */}
      <View style={[styles.contextRow, { borderLeftColor: color }]}>
        <GoldIcon name="information" size={14} color={color} />
        <Text style={styles.contextText}>
          {t('campaign.belongs_to_pack', { name: battleName, count: campaign.battleIds.length })}
        </Text>
      </View>

      {/* Statystyki pakietu */}
      <View style={styles.statsRow}>
        <StatPill icon="sword-cross" label={t('campaign.battles_count', { count: campaign.battleIds.length })} color={color} />
        {savePercent > 0 && (
          <StatPill icon="tag" label={t('campaign.save_percent', { pct: savePercent })} color="#4ade80" />
        )}
        <StatPill icon="coins" label={`${campaign.price}`} color={Colors.gold} />
      </View>

      {/* CTA */}
      <TouchableOpacity
        style={[
          styles.ctaBtn,
          { backgroundColor: canAfford ? color : '#2a2a2a' },
          !canAfford && styles.ctaBtnDisabled,
        ]}
        onPress={onPurchase}
        activeOpacity={0.85}
        disabled={!canAfford}
      >
        <GoldIcon
          name={canAfford ? 'lock-open-variant' : 'lock'}
          size={16}
          color={canAfford ? '#000' : '#666'}
        />
        {canAfford ? (
          <Text style={[styles.ctaText, { color: '#000' }]}>
            {t('campaign.unlock_campaign', { price: campaign.price })}
          </Text>
        ) : (
          <Text style={[styles.ctaText, { color: '#666' }]}>
            {t('campaign.missing_coins', { amount: campaign.price - userCoins })}
          </Text>
        )}
      </TouchableOpacity>

      {/* Cena przekreślona */}
      {campaign.originalPrice && (
        <Text style={styles.originalPrice}>
          {t('campaign.original_price', { price: campaign.originalPrice, count: campaign.battleIds.length })}
        </Text>
      )}
    </Animated.View>
  );
}

// ── Kompaktowa wersja (MapScreen LockedBattleSheet) ────────────
function CompactCampaignBanner({ campaign, userCoins, onPurchase }: {
  campaign: Campaign; userCoins: number; onPurchase: () => void;
}) {
  const { t } = useTranslation();
  const canAfford   = userCoins >= campaign.price;
  const savePercent = campaignSavePercent(campaign);
  const color       = campaign.accentColor;

  return (
    <View style={[styles.compactWrap, { borderColor: `${color}60` }]}>
      {/* Linia z ikoną i nazwą */}
      <View style={styles.compactHeader}>
        <View style={[styles.compactBadge, { backgroundColor: `${color}20` }]}>
          <GoldIcon name={campaign.badgeIcon} size={16} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.compactLabel}>{t('campaign.pack_label')}</Text>
          <Text style={[styles.compactName, { color }]}>{campaign.name}</Text>
        </View>
        <View style={styles.compactPriceBadge}>
          {savePercent > 0 && (
            <Text style={styles.compactSave}>-{savePercent}%</Text>
          )}
          <Text style={[styles.compactPrice, { color }]}>{campaign.price}</Text>
        </View>
      </View>

      {/* Treść */}
      <Text style={styles.compactDesc} numberOfLines={2}>
        {t('campaign.unlock_pack', { count: campaign.battleIds.length })}
      </Text>

      {/* Przycisk */}
      <TouchableOpacity
        style={[styles.compactBtn, { backgroundColor: canAfford ? color : '#222' }]}
        onPress={onPurchase}
        activeOpacity={0.85}
        disabled={!canAfford}
      >
        <GoldIcon
          name={canAfford ? 'package-variant-closed' : 'lock'}
          size={14}
          color={canAfford ? '#000' : '#555'}
        />
        <Text style={[styles.compactBtnText, { color: canAfford ? '#000' : '#555' }]}>
          {canAfford
            ? t('campaign.buy_pack', { price: campaign.price })
            : t('campaign.missing_short', { amount: campaign.price - userCoins })}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Pomocniczy pill ───────────────────────────────────────────
function StatPill({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: `${color}18`, borderColor: `${color}40` }]}>
      <GoldIcon name={icon} size={11} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

// ── Style ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Full ───────────────────────────
  fullWrap: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: '#0e0e0e',
    padding: 16,
    gap: 12,
  },
  dismissBtn: {
    position: 'absolute', top: 12, right: 12, zIndex: 10,
  },
  fullHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  badgeCircle: {
    width: 48, height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packLabel: {
    fontSize: 9, fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  campaignName: {
    fontSize: 17, fontWeight: '800',
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: 12, color: Colors.textMuted,
    marginTop: 2,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    borderLeftWidth: 3,
    padding: 10,
  },
  contextText: {
    flex: 1, fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  pillText: {
    fontSize: 11, fontWeight: '600',
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 10,
  },
  ctaBtnDisabled: {
    borderWidth: 1, borderColor: '#333',
  },
  ctaText: {
    fontSize: 14, fontWeight: '700',
  },
  originalPrice: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
    marginTop: -4,
  },

  // ── Compact ────────────────────────
  compactWrap: {
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(20,16,8,0.95)',
    padding: 12,
    gap: 8,
    marginTop: 10,
  },
  compactHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  compactBadge: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  compactLabel: {
    fontSize: 8, fontWeight: '700',
    color: Colors.textMuted, letterSpacing: 1.2,
  },
  compactName: {
    fontSize: 13, fontWeight: '700',
  },
  compactPriceBadge: {
    alignItems: 'flex-end',
  },
  compactSave: {
    fontSize: 10, fontWeight: '700',
    color: '#4ade80', marginBottom: 2,
  },
  compactPrice: {
    fontSize: 14, fontWeight: '800',
  },
  compactDesc: {
    fontSize: 11, color: Colors.textMuted, lineHeight: 15,
  },
  compactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 9, borderRadius: 8,
  },
  compactBtnText: {
    fontSize: 13, fontWeight: '700',
  },
});
