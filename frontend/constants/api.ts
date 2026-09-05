/**
 * Backend API adresi (tek merkez).
 *
 * Öncelik sırası:
 *   1. EXPO_PUBLIC_BACKEND_URL ortam değişkeni (.env dosyasından)
 *   2. Aşağıdaki varsayılan değer (geliştirme/test için)
 *
 * IP değiştiğinde (örn. farklı bir Wi-Fi ağına geçildiğinde) tek yapman
 * gereken .env dosyasındaki EXPO_PUBLIC_BACKEND_URL değerini güncellemek —
 * hiçbir .tsx dosyasına dokunmana gerek yok.
 *
 * Central backend API address.
 *
 * Priority:
 *   1. EXPO_PUBLIC_BACKEND_URL environment variable (from .env)
 *   2. The default value below (for local development/testing)
 *
 * When the IP changes (e.g. switching Wi-Fi networks), you only need to
 * update EXPO_PUBLIC_BACKEND_URL in .env — no .tsx file needs editing.
 */
export const BACKEND_URL =
  process.env.EXPO_PUBLIC_BACKEND_URL ?? "http://192.168.1.106:8000";
