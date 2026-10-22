import { Room, RoomEvent, Track } from "https://esm.sh/livekit-client@2";
import { CONFIG } from "./config.js";
import { el } from "./utils.js";

// Compartilhamento de tela em 1080p60 com áudio do sistema.
const SCREEN_OPTIONS = {
  audio: true,
  resolution: { width: 1920, height: 1080, frameRate: 60 },
  contentHint: "motion",
};

function friendlyMediaError(e) {
  if (e?.name === "NotAllowedError") return "Permissão negada. Libere câmera, microfone ou tela no navegador.";
  if (e?.name === "NotFoundError") return "Nenhum dispositivo encontrado.";
  return e?.message || "Erro de mídia.";
}

export class CallManager {
  constructor({ stage, stats, onError, onChange }) {
    this.stage = stage;
    this.statsEl = stats;
    this.onError = onError;
    this.onChange = onChange;
    this.room = null;
    this.statsTimer = null;
  }

  get connected() {
    return !!this.room && this.room.state === "connected";
  }

  get state() {
    const lp = this.room?.localParticipant;
    return {
      connected: this.connected,
      mic: !!lp?.isMicrophoneEnabled,
      cam: !!lp?.isCameraEnabled,
      screen: !!lp?.isScreenShareEnabled,
    };
  }

  async join(roomId, name) {
    if (this.connected) return;

    const identity = crypto.randomUUID();
    let res;
    try {
      res = await fetch(CONFIG.TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, identity, name }),
      });
    } catch {
      throw new Error("Servidor de token indisponível.");
    }
    if (!res.ok) throw new Error("Não foi possível obter o token de acesso.");
    const { token } = await res.json();

    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      publishDefaults: {
        videoCodec: "vp9",
        screenShareEncoding: { maxBitrate: 8_000_000, maxFramerate: 60 },
        audioPreset: { maxBitrate: 128_000 },
      },
    });

    this.bindEvents(name);

    await this.room.connect(CONFIG.LIVEKIT_URL, token);

    try {
      await this.room.localParticipant.setMicrophoneEnabled(true);
    } catch (e) {
      this.onError?.(friendlyMediaError(e));
    }

    this.startStats();
    this.onChange?.();
  }

  bindEvents(localName) {
    const r = this.room;

    r.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      this.addTrack(track, participant.identity, participant.name || participant.identity, false);
    });

    r.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      this.removeTrack(track, participant.identity);
    });

    r.on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.track) this.addTrack(pub.track, r.localParticipant.identity, localName, true);
      this.onChange?.();
    });

    r.on(RoomEvent.LocalTrackUnpublished, (pub) => {
      if (pub.track) this.removeTrack(pub.track, r.localParticipant.identity);
      this.onChange?.();
    });

    r.on(RoomEvent.ParticipantDisconnected, (participant) => {
      this.removeParticipant(participant.identity);
    });

    r.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const ids = new Set(speakers.map((s) => s.identity));
      this.stage.querySelectorAll(".tile").forEach((tile) => {
        tile.classList.toggle("speaking", ids.has(tile.dataset.key));
      });
    });

    r.on(RoomEvent.Disconnected, () => {
      this.cleanup();
      this.onChange?.();
    });
  }

  keyFor(track, identity) {
    return track.source === Track.Source.ScreenShare ? `${identity}:screen` : identity;
  }

  getTile(key, label) {
    let tile = this.stage.querySelector(`[data-key="${CSS.escape(key)}"]`);
    if (!tile) {
      const isScreen = key.endsWith(":screen");
      tile = el("div", "tile");
      tile.dataset.key = key;
      tile.append(el("div", "media"), el("span", "label", isScreen ? `${label} (tela)` : label));
      if (isScreen) {
        tile.classList.add("is-screen");
        this.stage.prepend(tile);
      } else {
        this.stage.append(tile);
      }
    }
    return tile;
  }

  addTrack(track, identity, label, isLocal) {
    // Não reproduz o próprio áudio localmente, para evitar eco.
    if (isLocal && track.kind === Track.Kind.Audio) return;

    const key = this.keyFor(track, identity);
    const tile = this.getTile(key, label);
    const media = track.attach();
    if (isLocal) media.muted = true;
    tile.querySelector(".media").append(media);
  }

  removeTrack(track, identity) {
    const key = this.keyFor(track, identity);
    track.detach().forEach((node) => node.remove());
    const tile = this.stage.querySelector(`[data-key="${CSS.escape(key)}"]`);
    // Tela compartilhada some junto com a transmissão. Câmera fica o tile do participante.
    if (tile && key.endsWith(":screen")) tile.remove();
  }

  removeParticipant(identity) {
    this.stage.querySelectorAll(".tile").forEach((tile) => {
      if (tile.dataset.key === identity || tile.dataset.key === `${identity}:screen`) {
        tile.remove();
      }
    });
  }

  async toggleMic() {
    try {
      const lp = this.room.localParticipant;
      await lp.setMicrophoneEnabled(!lp.isMicrophoneEnabled);
    } catch (e) {
      this.onError?.(friendlyMediaError(e));
    }
    this.onChange?.();
  }

  async toggleCam() {
    try {
      const lp = this.room.localParticipant;
      await lp.setCameraEnabled(!lp.isCameraEnabled);
    } catch (e) {
      this.onError?.(friendlyMediaError(e));
    }
    this.onChange?.();
  }

  async toggleScreen() {
    try {
      const lp = this.room.localParticipant;
      await lp.setScreenShareEnabled(!lp.isScreenShareEnabled, SCREEN_OPTIONS);
    } catch (e) {
      this.onError?.(friendlyMediaError(e));
    }
    this.onChange?.();
  }

  startStats() {
    this.statsEl.classList.remove("hidden");
    this.statsTimer = setInterval(() => {
      const pub = this.room?.localParticipant.getTrackPublication(Track.Source.ScreenShare);
      const settings = pub?.track?.mediaStreamTrack?.getSettings();
      this.statsEl.textContent = settings
        ? `Tela: ${settings.width}×${settings.height} @ ${Math.round(settings.frameRate ?? 0)} fps`
        : "Tela: não compartilhada";
    }, 1000);
  }

  async leave() {
    if (!this.room) return;
    const room = this.room;
    this.room = null;
    await room.disconnect();
    this.cleanup();
  }

  cleanup() {
    clearInterval(this.statsTimer);
    this.statsEl.classList.add("hidden");
    this.stage.innerHTML = "";
    this.room = null;
  }
}