import { parseCamelot } from "./set-flow";
import type { MixSet, Track, Transition } from "./workspace-types";

const majorNames = ["B", "F#", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E"];
const minorNames = ["Abm", "Ebm", "Bbm", "Fm", "Cm", "Gm", "Dm", "Am", "Em", "Bm", "F#m", "Dbm"];

// Rekordbox "Tonality" expects musical names; Camelot input is converted, anything else passes through.
export function tonality(key: string) {
  const parsed = parseCamelot(key);
  if (!parsed) return key.trim();
  return (parsed.letter === "B" ? majorNames : minorNames)[parsed.number - 1];
}

export function safeFileName(text: string) {
  // Letters (any script), digits and a few separators only; browsers drop names with other symbols.
  return text.replace(/[^\p{L}\p{N} ._()&'+,-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 120) || "mixnotes-set";
}

// Audio attached in MixNotes keeps its original file name; otherwise guess "Artist - Title.mp3".
export function fileNameFor(track: Track, attached?: string) {
  return attached || `${safeFileName(`${track.artist ? `${track.artist} - ` : ""}${track.title}`)}.mp3`;
}

export function joinPath(folder: string, file: string) {
  const base = folder.trim();
  if (!base) return file;
  const separator = base.includes("\\") && !base.includes("/") ? "\\" : "/";
  return base.endsWith(separator) ? base + file : base + separator + file;
}

export function buildM3U(set: MixSet, tracks: Track[], folder = "", names = new Map<string, string>()) {
  const lines = ["#EXTM3U", `#PLAYLIST:${set.title}`];
  for (const track of tracks) {
    lines.push(`#EXTINF:${track.durationSeconds ?? -1},${track.artist ? `${track.artist} - ` : ""}${track.title}`);
    lines.push(joinPath(folder, fileNameFor(track, names.get(track.id))));
  }
  return lines.join("\r\n") + "\r\n";
}

const xml = (value: string | number) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

export function fileUrl(path: string) {
  const normal = path.replace(/\\/g, "/");
  const absolute = /^[a-z]:\//i.test(normal) ? `/${normal}` : normal.startsWith("/") ? normal : `/${normal}`;
  return `file://localhost${absolute.split("/").map((part) => encodeURIComponent(part).replace(/%3A/g, ":")).join("/")}`;
}

export function buildRekordboxXml(set: MixSet, tracks: Track[], transitions: Transition[], folder = "", names = new Map<string, string>()) {
  const entries = tracks.map((track, index) => {
    const next = tracks[index + 1];
    const transition = next ? transitions.find((t) => t.fromTrackId === track.id && t.toTrackId === next.id) : undefined;
    const comment = [track.cueNotes && `CUE ${track.cueNotes}`, transition && `→ ${[transition.transitionType, transition.mixOutPoint, transition.eqTechnique].filter(Boolean).join(" · ")}`].filter(Boolean).join(" | ");
    const attributes: [string, string | number][] = [
      ["TrackID", index + 1],
      ["Name", track.title],
      ["Artist", track.artist],
      ["Genre", track.genre],
      ["Label", track.label],
      ["TotalTime", track.durationSeconds ?? 0],
      ["AverageBpm", track.bpm !== null ? track.bpm.toFixed(2) : "0.00"],
      ["Tonality", tonality(track.musicalKey)],
      ["Rating", [0, 51, 102, 153, 204, 255][track.rating] ?? 0],
      ["Comments", comment],
      ["Location", fileUrl(joinPath(folder || "/", fileNameFor(track, names.get(track.id))))],
    ];
    return `    <TRACK ${attributes.map(([k, v]) => `${k}="${xml(v)}"`).join(" ")}/>`;
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<DJ_PLAYLISTS Version="1.0.0">',
    '  <PRODUCT Name="MixNotes" Version="1.0" Company="MixNotes"/>',
    `  <COLLECTION Entries="${tracks.length}">`,
    ...entries,
    "  </COLLECTION>",
    "  <PLAYLISTS>",
    '    <NODE Type="0" Name="ROOT" Count="1">',
    `      <NODE Name="${xml(set.title)}" Type="1" KeyType="0" Entries="${tracks.length}">`,
    ...tracks.map((_, index) => `        <TRACK Key="${index + 1}"/>`),
    "      </NODE>",
    "    </NODE>",
    "  </PLAYLISTS>",
    "</DJ_PLAYLISTS>",
    "",
  ].join("\n");
}
