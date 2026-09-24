import { useSyncExternalStore } from 'react';

/*
 * "Uygulamayi yukle" destegi.
 *
 * Chrome/Edge, site PWA sartlarini saglayinca "beforeinstallprompt" olayini BIR KEZ ve sayfa acilir acilmaz atar.
 * O an Ayarlar sayfasi henuz acik olmayabilir; bu yuzden olay burada, modul seviyesinde yakalanip saklanir
 * (main.tsx bu dosyayi en basta import eder). Bilesenler useInstallState() ile guncel durumu okur.
 *
 * Safari (iOS) bu olayi hic desteklemez: orada yukleme "Paylas -> Ana Ekrana Ekle" ile elle yapilir,
 * biz de sadece yol tarifi gosteririz.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** Tarayici yukleme penceresini acmamiza izin veriyor (Chrome/Edge). */
  canInstall: boolean;
  /** Uygulama zaten yuklu pencerede (standalone) calisiyor ya da az once yuklendi. */
  installed: boolean;
  /** iPhone/iPad: elle "Ana Ekrana Ekle" gerekir. */
  isIos: boolean;
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = { canInstall: false, installed: isStandalone(), isIos };
const listeners = new Set<() => void>();

function update(patch: Partial<InstallState>) {
  state = { ...state, ...patch }; // yeni nesne: useSyncExternalStore degisikligi referanstan anlar
  listeners.forEach((listener) => listener());
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // tarayicinin kendi mini-cubugunu gosterme; butonu biz sunuyoruz
  deferred = e as BeforeInstallPromptEvent;
  update({ canInstall: true });
});

window.addEventListener('appinstalled', () => {
  deferred = null;
  update({ canInstall: false, installed: true });
});

/** Tarayicinin yukleme penceresini acar. Kullanici kabul ederse true doner. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null; // olay tek kullanimlik
  update({ canInstall: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useInstallState(): InstallState {
  return useSyncExternalStore(subscribe, () => state);
}
