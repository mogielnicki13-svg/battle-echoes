// ============================================================
// BATTLE ECHOES — LanguageSelector.tsx
// Przełącznik języka — kompaktowy pill-switch
// ============================================================
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, Radius } from '../constants/theme';
import { Icon } from './GoldIcon';
import {
  SUPPORTED_LANGUAGES,
  changeLanguage,
  getCurrentLanguage,
  type SupportedLanguage,
} from '../i18n';

export default function LanguageSelector() {
  const { t } = useTranslation();
  const [modalVisible, setModalVisible] = useState(false);
  const [currentLang, setCurrentLang] = useState(getCurrentLanguage);

  const handleSelect = async (lang: SupportedLanguage) => {
    await changeLanguage(lang);
    setCurrentLang(lang);
    setModalVisible(false);
  };

  const current = SUPPORTED_LANGUAGES.find(l => l.code === currentLang);

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Icon id="translate" size={16} color={Colors.gold} />
        <Text style={styles.triggerText}>
          {current?.flag} {current?.label}
        </Text>
        <Icon id="chevron-right" size={14} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{t('common.language')}</Text>

            {SUPPORTED_LANGUAGES.map(lang => {
              const isActive = lang.code === currentLang;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.option, isActive && styles.optionActive]}
                  onPress={() => handleSelect(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionFlag}>{lang.flag}</Text>
                  <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                    {lang.label}
                  </Text>
                  {isActive && <Icon id="check" size={18} color={Colors.gold} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(212,160,23,0.08)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.15)',
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  sheet: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#1a1a2e',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(212,160,23,0.2)',
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.gold,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.sm,
    marginVertical: 2,
  },
  optionActive: {
    backgroundColor: 'rgba(212,160,23,0.12)',
  },
  optionFlag: {
    fontSize: 22,
  },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  optionLabelActive: {
    color: Colors.gold,
    fontWeight: '700',
  },
});
