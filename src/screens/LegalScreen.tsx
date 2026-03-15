// ============================================================
// BATTLE ECHOES — LegalScreen.tsx
// Polityka Prywatności & Regulamin
// ============================================================
import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types';
import { logScreenView } from '../services/AnalyticsService';
import { Colors, Spacing, Radius } from '../constants/theme';
import { Icon } from '../components/GoldIcon';
import { useTranslation } from 'react-i18next';

type LegalType = 'privacy' | 'terms';

// ── Content ──────────────────────────────────────────────────
const PRIVACY_POLICY = `
Ostatnia aktualizacja: 14 marca 2026

1. ADMINISTRATOR DANYCH
Battle Echoes ("Aplikacja") jest rozwijana jako projekt niezależny. Administratorem danych osobowych jest twórca aplikacji.

2. ZBIERANE DANE
Zbieramy wyłącznie dane niezbędne do działania Aplikacji:
• Dane konta — imię, adres e-mail, identyfikator konta Google/Apple (przy logowaniu)
• Dane rozgrywki — postępy, statystyki, poziom XP, odblokowane treści
• Dane lokalizacji — współrzędne GPS (tylko za Twoją zgodą, wyłącznie do funkcji "Pola Bitew w Pobliżu")
• Dane analityczne — anonimowe statystyki użycia ekranów i funkcji (Firebase Analytics)

3. CEL PRZETWARZANIA
• Świadczenie usług Aplikacji (logowanie, zapis postępów, ranking)
• Funkcja GPS — wyświetlanie pobliskich pól bitewnych
• Ulepszanie Aplikacji na podstawie anonimowych statystyk
• Powiadomienia push (za Twoją zgodą)

4. UDOSTĘPNIANIE DANYCH
Nie sprzedajemy Twoich danych. Korzystamy z usług:
• Google Firebase — uwierzytelnianie, baza danych, analityka
• Google Maps — wyświetlanie mapy i markerów
• ElevenLabs — generowanie narracji audio (nie przesyłamy danych osobowych)
• RevenueCat — obsługa płatności w aplikacji

5. PRZECHOWYWANIE DANYCH
• Dane konta — przechowywane na serwerach Firebase (EU/US) do czasu usunięcia konta
• Dane lokalizacji — przetwarzane tylko na urządzeniu, nie wysyłamy na serwer
• Cache audio — przechowywane lokalnie na urządzeniu

6. TWOJE PRAWA (RODO)
Masz prawo do:
• Dostępu do swoich danych
• Poprawienia danych
• Usunięcia konta i danych (napisz na adres podany w sekcji Kontakt)
• Przenoszenia danych
• Sprzeciwu wobec przetwarzania
• Cofnięcia zgody w dowolnym momencie

7. DZIECI
Aplikacja jest przeznaczona dla użytkowników w wieku 13+. Nie zbieramy świadomie danych od dzieci poniżej 13 roku życia.

8. BEZPIECZEŃSTWO
Stosujemy standardowe środki bezpieczeństwa: szyfrowanie w tranzycie (TLS), bezpieczne uwierzytelnianie OAuth 2.0, reguły bezpieczeństwa Firestore.

9. ZMIANY
O istotnych zmianach w polityce prywatności poinformujemy w Aplikacji.

10. KONTAKT
Pytania dotyczące prywatności: battleechoes.app@gmail.com
`.trim();

const TERMS_OF_SERVICE = `
Ostatnia aktualizacja: 14 marca 2026

1. POSTANOWIENIA OGÓLNE
Niniejszy Regulamin określa zasady korzystania z aplikacji mobilnej Battle Echoes ("Aplikacja").

2. KONTO UŻYTKOWNIKA
• Konto można utworzyć przez Google, Apple lub jako gość
• Konto gościa oferuje ograniczony dostęp (48h pełnych funkcji w ramach Paczki Rekruta)
• Użytkownik odpowiada za bezpieczeństwo swojego konta
• Jedno konto na osobę — współdzielenie kont jest zabronione

3. TREŚCI
• Narracje historyczne mają charakter edukacyjny i rozrywkowy
• Treści oparto na źródłach historycznych, ale mogą zawierać uproszczenia
• Aplikacja nie stanowi podręcznika akademickiego

4. WALUTA WIRTUALNA (DUKATY)
• Dukaty to waluta wirtualna w Aplikacji
• Można je zdobyć grając (odsłuchiwanie narracji, odwiedzanie pól bitewnych, quizy) lub kupić za prawdziwe pieniądze
• Dukaty nie mają wartości pieniężnej poza Aplikacją
• Zakupione Dukaty nie podlegają zwrotowi (z wyjątkiem wymogów prawnych)
• Dukaty nie wygasają

5. ZAKUPY W APLIKACJI
• Płatności obsługiwane przez Google Play / Apple App Store
• Ceny podane w walucie lokalnej
• Zasady zwrotów reguluje polityka odpowiedniego sklepu (Google Play / App Store)

6. DOZWOLONE UŻYCIE
Zabrania się:
• Korzystania z botów, skryptów automatyzujących lub exploitów
• Próby manipulacji rankingami lub statystykami
• Odsprzedaży konta lub walut wirtualnych
• Kopiowania treści Aplikacji bez zgody

7. DOSTĘPNOŚĆ
• Aplikacja oferowana jest "tak jak jest" (as is)
• Zastrzegamy prawo do przerw technicznych i aktualizacji
• Nie gwarantujemy nieprzerwanego działania

8. WŁASNOŚĆ INTELEKTUALNA
• Kod aplikacji, projekt graficzny, narracje audio i teksty stanowią własność twórcy
• Zdjęcia historyczne: Wikimedia Commons (licencja CC)
• Czcionki: Cinzel (OFL), Crimson Pro (OFL), JetBrains Mono (OFL)

9. ODPOWIEDZIALNOŚĆ
• Aplikacja ma charakter edukacyjno-rozrywkowy
• Nie ponosimy odpowiedzialności za decyzje podjęte na podstawie treści Aplikacji
• Funkcja GPS wymaga ostrożności — zawsze zwracaj uwagę na otoczenie

10. ROZWIĄZANIE
• Możesz usunąć konto w dowolnym momencie
• Zastrzegamy prawo do zawieszenia kont naruszających Regulamin

11. PRAWO WŁAŚCIWE
Regulamin podlega prawu polskiemu. Spory rozstrzygane przez sąd właściwy dla siedziby Administratora.

12. KONTAKT
Pytania dotyczące Regulaminu: battleechoes.app@gmail.com
`.trim();

const CONTENT: Record<LegalType, { titleKey: string; text: string }> = {
  privacy: { titleKey: 'legal.title_privacy', text: PRIVACY_POLICY },
  terms:   { titleKey: 'legal.title_terms',   text: TERMS_OF_SERVICE },
};

// ── Component ────────────────────────────────────────────────
export default function LegalScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Legal'>>();
  const { t } = useTranslation();
  const type: LegalType = route.params?.type ?? 'privacy';
  const { titleKey, text } = CONTENT[type];
  const title = t(titleKey);

  useFocusEffect(useCallback(() => { logScreenView(`Legal_${type}`); }, [type]));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon id="chevron_left" size={20} color={Colors.gold} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {text.split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <View key={i} style={{ height: 12 }} />;

          // Section headers (numbered: "1. SOMETHING")
          const isHeader = /^\d+\.\s+[A-Z\u0104\u0106\u0118\u0141\u0143\u00D3\u015A\u0179\u017B]/.test(trimmed);
          // Bullet points
          const isBullet = trimmed.startsWith('\u2022');

          if (isHeader) {
            return (
              <Text key={i} style={styles.sectionHeader}>{trimmed}</Text>
            );
          }
          if (isBullet) {
            return (
              <Text key={i} style={styles.bulletText}>{trimmed}</Text>
            );
          }
          return (
            <Text key={i} style={styles.bodyText}>{trimmed}</Text>
          );
        })}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {t('legal.copyright')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,160,23,0.15)',
  },
  backBtn: {
    width: 40, height: 40,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(212,160,23,0.1)',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.gold,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '800',
    color: Colors.gold,
    marginTop: 16,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  bodyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
  },
  bulletText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 8,
  },
  footer: {
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212,160,23,0.1)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
});
