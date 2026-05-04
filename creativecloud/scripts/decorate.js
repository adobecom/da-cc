export default function defineDeviceByScreenSize() {
  const DESKTOP_SIZE = 1200;
  const MOBILE_SIZE = 600;
  const screenWidth = window.innerWidth;
  if (screenWidth >= DESKTOP_SIZE) {
    return 'DESKTOP';
  }
  if (screenWidth <= MOBILE_SIZE) {
    return 'MOBILE';
  }
  return 'TABLET';
}


export const MEDIA_BUS_TOPICS = Object.freeze({
  PLAYED: 'media-played',
  PAUSED: 'media-paused',
  ENDED: 'media-ended',
  PAUSE_ALL: 'pause-all',
  STOP_ALL: 'stop-all',
});


export const MEDIA_TYPES = Object.freeze({
  AUDIO: 'audio',
  VIDEO: 'video',
});

const MEDIA_BUS_LANA_OPTIONS = { tags: 'media-bus', errorType: 'i' };

let globalMediaBus;

/**
 * @returns {{
 *   subscribe: (topic: string, handler: (payload?: any) => void) => () => void,
 *   publish: (topic: string, payload?: any) => void,
 *   destroy: () => void,
 * }}
 */
export function getGlobalMediaBus() {
  if (!globalMediaBus) {
    const topics = new Map();

    globalMediaBus = {
      subscribe(topic, handler) {
        if (!topics.has(topic)) topics.set(topic, new Set());
        const handlers = topics.get(topic);
        handlers.add(handler);
        return () => handlers.delete(handler);
      },
      publish(topic, payload) {
        topics.get(topic)?.forEach((handler) => {
          try {
            handler(payload);
          } catch (err) {
            window.lana?.log(
              `mediaBus handler failed for "${topic}": ${err}`,
              MEDIA_BUS_LANA_OPTIONS,
            );
          }
        });
      },
      destroy() {
        topics.clear();
        globalMediaBus = undefined;
      },
    };
  }
  return globalMediaBus;
}
