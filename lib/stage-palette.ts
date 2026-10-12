/**
 * "Sahne" palette helper.
 *
 * Fikir: Uygulamanın kimliği gün batımındaki bir gece kulübü. Parçanın rengi bu
 * dünyanın SINIRLARI içinde kalır. Kapaktan ne renk çıkarsa çıksın, ton şu
 * yay üzerine haritalanır: mor (262°) → magenta (330°) → kızıl-turuncu (10°)
 * → amber (42°). Yeşil, turkuaz, mavi gibi tonlar bu yayın dışında kaldığı
 * için asla ekrana çıkmaz.
 *
 * Hue değerleri bilerek 262–402 aralığında "açık" tutulur (360'ı geçebilir).
 * Böylece CSS geçişlerinde bir şarkıdan diğerine renk, tüm renk çemberini
 * dolaşmak yerine yay üzerinde kısa yoldan kayar.
 */

export type StageTone = { hue: number; sat: number; light: number };

const ARC_START = 262;
const ARC_LENGTH = 140; // 262° → 402° (= 42°)
const SAT_MIN = 62;
const SAT_MAX = 90;
const LIGHT_MIN = 52;
const LIGHT_MAX = 64;

/** Hiç parça seçili değilken kullanılan gün batımı turuncusu. */
export const STAGE_DEFAULT: StageTone = { hue: 374, sat: 84, light: 58 };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Herhangi bir rengi (HSL) gün batımı yayının içine yerleştirir. */
export function mapToStageGamut(hue: number, sat: number, light: number): StageTone {
  const wrapped = ((hue % 360) + 360) % 360;
  return {
    hue: Math.round(ARC_START + (wrapped / 360) * ARC_LENGTH),
    sat: Math.round(clamp(sat, SAT_MIN, SAT_MAX)),
    light: Math.round(clamp(light, LIGHT_MIN, LIGHT_MAX)),
  };
}

/** Aynı metin her zaman aynı tonu verir. Kapak yoksa yedek renk budur. */
export function toneFromText(text: string): StageTone {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hue = Math.abs(hash) % 360;
  return mapToStageGamut(hue, 80, 58);
}

function rgbToHsl(r: number, g: number, b: number) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const light = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { h: 0, s: 0, l: light * 100 };
  const sat = delta / (1 - Math.abs(2 * light - 1));
  let hue: number;
  if (max === rn) hue = ((gn - bn) / delta) % 6;
  else if (max === gn) hue = (bn - rn) / delta + 2;
  else hue = (rn - gn) / delta + 4;
  return { h: (hue * 60 + 360) % 360, s: sat * 100, l: light * 100 };
}

const coverCache = new Map<string, StageTone | null>();

/**
 * Kapak görselinin baskın tonunu bulur ve gün batımı yayına sıkıştırır.
 * Tarayıcı görseli okumaya izin vermezse (CORS) ya da yüklenemezse null döner;
 * çağıran taraf toneFromText yedeğine düşer.
 */
export function extractCoverTone(url: string): Promise<StageTone | null> {
  if (!url || typeof window === "undefined") return Promise.resolve(null);
  if (coverCache.has(url)) return Promise.resolve(coverCache.get(url) ?? null);

  return new Promise((resolve) => {
    const finish = (tone: StageTone | null) => {
      coverCache.set(url, tone);
      resolve(tone);
    };
    const timer = window.setTimeout(() => finish(null), 4000);
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.referrerPolicy = "no-referrer";
    image.onload = () => {
      window.clearTimeout(timer);
      try {
        const size = 24;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) return finish(null);
        context.drawImage(image, 0, 0, size, size);
        const pixels = context.getImageData(0, 0, size, size).data;

        // Canlı pikseller daha ağır sayılır; gri ve çok koyu/açık pikseller sayılmaz.
        let x = 0;
        let y = 0;
        let weightSum = 0;
        let satSum = 0;
        let lightSum = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i + 3] < 200) continue;
          const { h, s, l } = rgbToHsl(pixels[i], pixels[i + 1], pixels[i + 2]);
          if (s < 18 || l < 12 || l > 92) continue;
          const weight = (s / 100) * (1 - Math.abs(l - 50) / 50);
          const rad = (h * Math.PI) / 180;
          x += Math.cos(rad) * weight;
          y += Math.sin(rad) * weight;
          satSum += s * weight;
          lightSum += l * weight;
          weightSum += weight;
        }
        if (weightSum < 0.5) return finish(null);
        const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
        finish(mapToStageGamut(hue, satSum / weightSum, lightSum / weightSum));
      } catch {
        finish(null);
      }
    };
    image.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };
    image.src = url;
  });
}

/** BPM'den bir ölçünün (4 vuruş) süresi, saniye. Çok hızlı atmasın diye sınırlı. */
export function barSeconds(bpm: number | null | undefined) {
  const safe = clamp(bpm && bpm > 0 ? bpm : 100, 70, 180);
  return Number(((60 / safe) * 4).toFixed(3));
}
