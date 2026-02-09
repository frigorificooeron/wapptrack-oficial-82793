import { useState, useCallback, useEffect } from 'react';

const NOTIFICATION_SOUNDS = [
  { id: 'notification-1', name: 'Clássico', description: 'Som estilo WhatsApp' },
  { id: 'notification-2', name: 'Suave', description: 'Tom gentil' },
  { id: 'notification-3', name: 'Moderno', description: 'Som digital' },
  { id: 'notification-4', name: 'Discreto', description: 'Notificação sutil' },
  { id: 'notification-5', name: 'Alegre', description: 'Tom animado' },
] as const;

const STORAGE_KEY = 'notification-sound-settings';

interface SoundSettings {
  enabled: boolean;
  selectedSound: string;
  volume: number;
}

const defaultSettings: SoundSettings = {
  enabled: true,
  selectedSound: 'notification-1',
  volume: 0.5,
};

export const useNotificationSound = () => {
  const [settings, setSettings] = useState<SoundSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Error loading sound settings:', e);
    }
    return defaultSettings;
  });

  // Persist settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Error saving sound settings:', e);
    }
  }, [settings]);

  const playNotificationSound = useCallback(() => {
    if (!settings.enabled) return;

    try {
      const audio = new Audio(`/sounds/${settings.selectedSound}.mp3`);
      audio.volume = settings.volume;
      audio.play().catch((err) => {
        // Browsers may block autoplay without user interaction
        console.warn('Could not play notification sound:', err);
      });
    } catch (err) {
      console.error('Error creating audio:', err);
    }
  }, [settings.enabled, settings.selectedSound, settings.volume]);

  const previewSound = useCallback((soundId: string) => {
    try {
      const audio = new Audio(`/sounds/${soundId}.mp3`);
      audio.volume = settings.volume;
      audio.play().catch((err) => {
        console.warn('Could not play preview sound:', err);
      });
    } catch (err) {
      console.error('Error playing preview:', err);
    }
  }, [settings.volume]);

  const setSoundEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, enabled }));
  }, []);

  const setSelectedSound = useCallback((selectedSound: string) => {
    setSettings((prev) => ({ ...prev, selectedSound }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    setSettings((prev) => ({ ...prev, volume: Math.max(0, Math.min(1, volume)) }));
  }, []);

  return {
    soundEnabled: settings.enabled,
    selectedSound: settings.selectedSound,
    volume: settings.volume,
    sounds: NOTIFICATION_SOUNDS,
    playNotificationSound,
    previewSound,
    setSoundEnabled,
    setSelectedSound,
    setVolume,
  };
};

export { NOTIFICATION_SOUNDS };
