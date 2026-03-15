// ============================================================
// BATTLE ECHOES — PurchaseService.ts
// RevenueCat — In-App Purchases
// ============================================================

import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ── RevenueCat API Keys ──────────────────────────────────────
// Set EXPO_PUBLIC_REVENUECAT_APPLE_KEY and EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY in .env
const REVENUECAT_API_KEYS = {
  apple:   process.env.EXPO_PUBLIC_REVENUECAT_APPLE_KEY  ?? '',
  google:  process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY ?? '',
};

// ── Product IDs (match your RevenueCat dashboard) ────────────
export const PRODUCT_IDS = {
  coins_small:  'be_coins_100',    // 100 coins — 2.99 PLN
  coins_medium: 'be_coins_300',    // 300+50 coins — 7.99 PLN
  coins_large:  'be_coins_700',    // 700+150 coins — 14.99 PLN
  coins_mega:   'be_coins_1500',   // 1500+400 coins — 24.99 PLN
} as const;

// Map product IDs to coin amounts (coins + bonus)
export const PRODUCT_COIN_MAP: Record<string, number> = {
  [PRODUCT_IDS.coins_small]:  100,
  [PRODUCT_IDS.coins_medium]: 350,
  [PRODUCT_IDS.coins_large]:  850,
  [PRODUCT_IDS.coins_mega]:   1900,
};

// Expo Go detection
const IS_EXPO_GO =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';

let isInitialized = false;

const purchaseService = {

  // Initialize RevenueCat SDK — call once at app start
  async initialize(userId?: string): Promise<void> {
    if (IS_EXPO_GO || isInitialized) return;

    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      const apiKey = Platform.OS === 'ios'
        ? REVENUECAT_API_KEYS.apple
        : REVENUECAT_API_KEYS.google;

      await Purchases.configure({ apiKey, appUserID: userId });
      isInitialized = true;
      if (__DEV__) console.log('[Purchases] RevenueCat initialized');
    } catch (e) {
      console.warn('[Purchases] Init failed:', e);
    }
  },

  // Identify user (call after login)
  async identify(userId: string): Promise<void> {
    if (IS_EXPO_GO || !isInitialized) return;
    try {
      await Purchases.logIn(userId);
    } catch (e) {
      console.warn('[Purchases] Identify failed:', e);
    }
  },

  // Log out user (call on sign out)
  async logout(): Promise<void> {
    if (IS_EXPO_GO || !isInitialized) return;
    try {
      await Purchases.logOut();
    } catch (e) {
      console.warn('[Purchases] Logout failed:', e);
    }
  },

  // Get available offerings (coin packs)
  async getOfferings(): Promise<PurchasesOffering | null> {
    if (IS_EXPO_GO || !isInitialized) return null;
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current ?? null;
    } catch (e) {
      console.warn('[Purchases] Offerings failed:', e);
      return null;
    }
  },

  // Purchase a specific package
  async purchasePackage(pkg: PurchasesPackage): Promise<{ success: boolean; coins: number }> {
    if (IS_EXPO_GO) {
      return { success: false, coins: 0 };
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const productId = pkg.product.identifier;
      const coins = PRODUCT_COIN_MAP[productId] ?? 0;
      return { success: true, coins };
    } catch (e: unknown) {
      if ((e as { userCancelled?: boolean }).userCancelled) {
        // User cancelled — not an error
        return { success: false, coins: 0 };
      }
      console.warn('[Purchases] Purchase failed:', e);
      throw e;
    }
  },

  // Purchase by product ID (convenience)
  async purchaseProduct(productId: string): Promise<{ success: boolean; coins: number }> {
    if (IS_EXPO_GO) {
      return { success: false, coins: 0 };
    }
    try {
      const offerings = await this.getOfferings();
      if (!offerings) throw new Error('No offerings available');

      const pkg = offerings.availablePackages.find(
        p => p.product.identifier === productId
      );
      if (!pkg) throw new Error(`Product ${productId} not found`);

      return await this.purchasePackage(pkg);
    } catch (e: unknown) {
      if ((e as { userCancelled?: boolean }).userCancelled) return { success: false, coins: 0 };
      throw e;
    }
  },

  // Restore previous purchases
  async restorePurchases(): Promise<CustomerInfo | null> {
    if (IS_EXPO_GO || !isInitialized) return null;
    try {
      const info = await Purchases.restorePurchases();
      return info;
    } catch (e) {
      console.warn('[Purchases] Restore failed:', e);
      return null;
    }
  },

  // Check if running in Expo Go (IAP unavailable)
  isAvailable(): boolean {
    return !IS_EXPO_GO && isInitialized;
  },
};

export default purchaseService;
