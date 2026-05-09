import { Audio, type AVPlaybackSource } from "expo-av";

const CLICK_SOURCE = require("../../../assets/audio/click.wav") as AVPlaybackSource;

type StartOptions = {
  bpm?: number;
};

export class Metronome {
  private sound: Audio.Sound | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private volume = 1;

  async start(options: StartOptions = {}): Promise<void> {
    const bpm = options.bpm ?? 100;
    const intervalMs = Math.round(60_000 / bpm);

    await this.stop();
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
    });

    const sound = new Audio.Sound();

    await sound.loadAsync(CLICK_SOURCE);
    await sound.setVolumeAsync(this.volume);
    this.sound = sound;
    await sound.replayAsync();

    this.timer = setInterval(() => {
      void this.sound?.replayAsync();
    }, intervalMs);
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (this.sound) {
      await this.sound.stopAsync().catch(() => undefined);
      await this.sound.unloadAsync().catch(() => undefined);
      this.sound = null;
    }
  }

  async setVolume(value: number): Promise<void> {
    this.volume = Math.max(0, Math.min(1, value));

    if (this.sound) {
      await this.sound.setVolumeAsync(this.volume);
    }
  }
}

