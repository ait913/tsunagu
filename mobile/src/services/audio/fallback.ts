import { Audio, type AVPlaybackSource } from "expo-av";

const FALLBACK_SOURCE = require("../../../assets/audio/cpr-loop.mp3") as AVPlaybackSource;

export class CprFallback {
  private sound: Audio.Sound | null = null;

  async play(): Promise<void> {
    if (this.sound) {
      const status = await this.sound.getStatusAsync();

      if (status.isLoaded) {
        await this.sound.playAsync();
        return;
      }
    }

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const sound = new Audio.Sound();

    await sound.loadAsync(FALLBACK_SOURCE, {
      isLooping: true,
      shouldPlay: true,
    });
    this.sound = sound;
  }

  async stop(): Promise<void> {
    if (!this.sound) {
      return;
    }

    await this.sound.stopAsync().catch(() => undefined);
    await this.sound.unloadAsync().catch(() => undefined);
    this.sound = null;
  }
}

