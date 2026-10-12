"use client";
import {L,Localized} from "./localized";

import { useCallback, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, LoaderCircle, Plus, Search, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { LinkMetadata } from "@/lib/workspace-types";
import { TrackLinkInput } from "./track-link-preview";
import type { DeleteState, EditorState } from "./workspace-context";
import { useWorkspace } from "./workspace-context";

function EditorFooter({ busy, onCancel, pending = false, label = "Kaydet" }: { busy: boolean; onCancel: () => void; pending?: boolean; label?: string }) {
  return (
    <Localized><div className="editor-footer">
      <button type="button" className="button secondary" disabled={busy} onClick={onCancel}><L text={"Vazgeç"}/></button>
      <button className="button primary" disabled={busy || pending}>{busy || pending ? <LoaderCircle className="spin" size={16} /> : <Check size={16} />}{busy ? <L text={"Kaydediliyor"}/> : pending ? <L text={"Bilgiler getiriliyor"}/> : label}</button>
    </div></Localized>
  );
}

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: ReactNode }) {
  return <Localized><label className={`form-field${wide ? " wide" : ""}`}><span>{label}</span>{children}{hint && <small>{hint}</small>}</label></Localized>;
}

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalNumber(form: FormData, key: string) {
  const raw = value(form, key);
  return raw ? Number(raw) : null;
}

function TrackEditor({ editor, close }: { editor: Extract<NonNullable<EditorState>, { kind: "track" }>; close: () => void }) {
  const { mutate, busy } = useWorkspace();
  const item = editor.item;
  const formRef = useRef<HTMLFormElement>(null);
  const [linkMetadata,setLinkMetadata] = useState<LinkMetadata|null>(item?.linkMetadata || null);
  const [linkLoading,setLinkLoading] = useState(false);
  const lastImported = useRef<Record<string,string>>({});
  const applyMetadata = useCallback((metadata:LinkMetadata|null)=>{
    setLinkMetadata(metadata);
    if (!metadata || !formRef.current) return;
    const fields:Record<string,string> = {title:metadata.title, artist:metadata.artist, genre:metadata.genre, durationSeconds:metadata.durationSeconds ? String(metadata.durationSeconds) : '', sourceProvider:metadata.provider};
    for(const [name,value] of Object.entries(fields)) {
      const field = formRef.current.elements.namedItem(name) as HTMLInputElement|null;
      if (field && (name === "sourceProvider" || !field.value || field.value === lastImported.current[name])) { field.value = value; lastImported.current[name] = value; }
    }
  },[]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      title: value(form, "title"), artist: value(form, "artist"), version: value(form, "version"),
      bpm: optionalNumber(form, "bpm"), musicalKey: value(form, "musicalKey"), genre: value(form, "genre"),
      subgenre: value(form, "subgenre"), energy: optionalNumber(form, "energy"), rating: Number(value(form, "rating") || 0),
      tags: value(form, "tags").split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 20),
      origin: value(form, "origin"), notes: value(form, "notes"), cueNotes: value(form, "cueNotes"),
      introNotes: value(form, "introNotes"), outroNotes: value(form, "outroNotes"),
      durationSeconds: optionalNumber(form, "durationSeconds"), label: value(form, "label"),
      sourceProvider: value(form, "sourceProvider"), sourceUrl: value(form, "sourceUrl"), linkMetadata,
    };
    const ok = await mutate(item ? { type: "track.update", id: item.id, expectedRevision: item.revision, input } : { type: "track.create", input }, item ? "Parça güncellendi" : "Parça kaydedildi");
    if (ok) close();
  }
  return (
    <Localized><form ref={formRef} onSubmit={submit}>
      <TrackLinkInput initialUrl={item?.sources[0]?.externalUrl} initialMetadata={item?.linkMetadata} onMetadata={applyMetadata} onLoading={setLinkLoading} />
      <div className="form-grid">
        <Field label="Parça adı"><input name="title" defaultValue={item?.title} required maxLength={200} /></Field>
        <Field label="Sanatçı"><input name="artist" defaultValue={item?.artist} maxLength={200} /></Field>
        <Field label="Versiyon / Remix"><input name="version" defaultValue={item?.version} maxLength={200} placeholder="Extended Mix" /></Field>
        <Field label="Durum"><select name="origin" defaultValue={item?.origin ?? editor.origin ?? "discovery"}><option value="discovery"><L text={"Discovery — henüz aday"}/></option><option value="library"><L text={"Library — çalabilirim"}/></option></select></Field>
        <Field label="BPM"><input name="bpm" type="number" min="1" max="999" step="0.1" defaultValue={item?.bpm ?? ""} inputMode="decimal" /></Field>
        <Field label="Key"><input name="musicalKey" defaultValue={item?.musicalKey} maxLength={20} placeholder="8A / A minor" /></Field>
        <Field label="Tür"><input name="genre" defaultValue={item?.genre} maxLength={100} placeholder="Afro House" /></Field>
        <Field label="Alt tür"><input name="subgenre" defaultValue={item?.subgenre} maxLength={100} /></Field>
        <Field label="Enerji"><select name="energy" defaultValue={item?.energy ?? ""}><option value=""><L text={"Belirtilmedi"}/></option>{[1, 2, 3, 4, 5].map((number) => <option key={number} value={number}>{number}/5</option>)}</select></Field>
        <Field label="Puan"><select name="rating" defaultValue={item?.rating ?? 0}><option value="0"><L text={"Puan yok"}/></option>{[1, 2, 3, 4, 5].map((number) => <option key={number} value={number}>{number}/5</option>)}</select></Field>
        <Field label="Etiketler" hint="Virgülle ayır" wide><input name="tags" defaultValue={item?.tags.join(", ")} maxLength={500} placeholder="warm-up, sunset, vokal" /></Field>
        <Field label="Kaynak adı" wide><input data-localize-attrs="placeholder" name="sourceProvider" defaultValue={item?.sources[0]?.provider} maxLength={100} placeholder="Bağlantıdan otomatik algılanır" /></Field>
        <Field label="Cue notları" wide><textarea name="cueNotes" rows={2} defaultValue={item?.cueNotes} maxLength={1000} placeholder="A: 00:32 giriş · B: 01:36 drop" /></Field>
        <Field label="DJ notu" wide><textarea data-localize-attrs="placeholder" name="notes" rows={3} defaultValue={item?.notes} maxLength={10000} placeholder="Bu parçayı nerede ve nasıl kullanmak istiyorsun?" /></Field>
      </div>
      <details className="advanced-fields">
        <summary><L text={"Daha fazla metadata ve hazırlık notu"}/></summary>
        <div className="form-grid">
          <Field label="Intro notu"><textarea name="introNotes" rows={2} defaultValue={item?.introNotes} maxLength={1000} /></Field>
          <Field label="Outro notu"><textarea name="outroNotes" rows={2} defaultValue={item?.outroNotes} maxLength={1000} /></Field>
          <Field label="Süre (saniye)"><input name="durationSeconds" type="number" min="1" max="86400" defaultValue={item?.durationSeconds ?? ""} /></Field>
          <Field label="Label"><input name="label" defaultValue={item?.label} maxLength={200} /></Field>
        </div>
      </details>
      <EditorFooter busy={busy} pending={linkLoading} onCancel={close} />
    </form></Localized>
  );
}

function CrateEditor({ editor, close }: { editor: Extract<NonNullable<EditorState>, { kind: "crate" }>; close: () => void }) {
  const { mutate, busy } = useWorkspace();
  const item = editor.item;
  const [smart,setSmart]=useState(Boolean(item?.rules));
  const [error,setError]=useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const rules=smart?{genre:value(form,"ruleGenre"),tag:value(form,"ruleTag"),bpmMin:optionalNumber(form,"bpmMin"),bpmMax:optionalNumber(form,"bpmMax"),energyMin:optionalNumber(form,"energyMin"),ratingMin:Number(value(form,"ratingMin")||0),origin:value(form,"ruleOrigin")}:null;
    if(rules&&rules.bpmMin!==null&&rules.bpmMax!==null&&rules.bpmMin>rules.bpmMax){setError("Minimum BPM maksimumdan büyük olamaz.");return;}
    setError("");
    const input = { name: value(form, "name"), description: value(form, "description"), rules };
    const ok = await mutate(item ? { type: "crate.update", id: item.id, expectedRevision: item.revision, input } : { type: "crate.create", input }, item ? "Crate güncellendi" : "Crate oluşturuldu");
    if (ok) close();
  }
  return <Localized><form onSubmit={submit}><div className="form-grid single-column"><Field label="Crate adı"><input name="name" defaultValue={item?.name} required maxLength={120} autoFocus placeholder="Afro House / Warm-up" /></Field><Field label="Açıklama"><textarea name="description" rows={2} defaultValue={item?.description} maxLength={1000} /></Field><label className="smart-toggle"><input type="checkbox" checked={smart} onChange={e=>setSmart(e.target.checked)}/><span><strong>Smart Crate</strong><small><L text={"Kurallara uyan parçalar otomatik eklenir. Tüm kurallar birlikte uygulanır."}/></small></span></label></div>{smart&&<div className="form-grid smart-rule-fields"><Field label="Tür içerir"><input name="ruleGenre" maxLength={200} defaultValue={item?.rules?.genre} placeholder="Afro House"/></Field><Field label="Etiket eşleşir"><input name="ruleTag" maxLength={40} defaultValue={item?.rules?.tag} placeholder="warm-up"/></Field><Field label="Minimum BPM"><input name="bpmMin" type="number" min="1" max="999" step="0.1" defaultValue={item?.rules?.bpmMin??""}/></Field><Field label="Maksimum BPM"><input name="bpmMax" type="number" min="1" max="999" step="0.1" defaultValue={item?.rules?.bpmMax??""}/></Field><Field label="Minimum enerji"><select name="energyMin" defaultValue={item?.rules?.energyMin??""}><option value=""><L text={"Her enerji"}/></option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}</select></Field><Field label="Minimum puan"><select name="ratingMin" defaultValue={item?.rules?.ratingMin??0}><option value="0"><L text={"Her puan"}/></option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n}/5</option>)}</select></Field><Field label="Parça durumu" wide><select name="ruleOrigin" defaultValue={item?.rules?.origin??"library"}><option value="all">Discovery + Library</option><option value="library">Library</option><option value="discovery">Discovery</option></select></Field></div>}{error&&<p className="inline-error" role="alert">{error}</p>}<EditorFooter busy={busy} onCancel={close} /></form></Localized>;
}

function SetEditor({ editor, close }: { editor: Extract<NonNullable<EditorState>, { kind: "set" }>; close: () => void }) {
  const { mutate, busy } = useWorkspace();
  const item = editor.item;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = { title: value(form, "title"), genre: value(form, "genre"), eventDate: value(form, "eventDate"), notes: value(form, "notes"), status: value(form, "status") };
    const ok = await mutate(item ? { type: "set.update", id: item.id, expectedRevision: item.revision, input } : { type: "set.create", input }, item ? "Set güncellendi" : "Set oluşturuldu");
    if (ok) close();
  }
  return <Localized><form onSubmit={submit}><div className="form-grid"><Field label="Set adı"><input name="title" defaultValue={item?.title} required maxLength={200} autoFocus placeholder="Brussels warm-up" /></Field><Field label="Tür / yön"><input name="genre" defaultValue={item?.genre} maxLength={100} placeholder="Afro → Melodic" /></Field><Field label="Tarih"><input name="eventDate" type="date" defaultValue={item?.eventDate} /></Field><Field label="Durum"><select name="status" defaultValue={item?.status ?? "draft"}><option value="draft"><L text={"Taslak"}/></option><option value="ready"><L text={"Hazır"}/></option><option value="performed"><L text={"Çalındı"}/></option></select></Field><Field label="Set notu" wide><textarea data-localize-attrs="placeholder" name="notes" rows={4} defaultValue={item?.notes} maxLength={10000} placeholder="Ortam, enerji yönü ve hatırlamak istediklerin…" /></Field></div><EditorFooter busy={busy} onCancel={close} /></form></Localized>;
}

function TransitionEditor({ editor, close }: { editor: Extract<NonNullable<EditorState>, { kind: "transition" }>; close: () => void }) {
  const { data, mutate, busy } = useWorkspace();
  const item = editor.item;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      audioSettings: item?.audioSettings && value(form, "fromTrackId") === item.fromTrackId && value(form, "toTrackId") === item.toTrackId && value(form, "mixOutPoint") === item.mixOutPoint && value(form, "mixInPoint") === item.mixInPoint ? item.audioSettings : null, fromTrackId: value(form, "fromTrackId") || null, toTrackId: value(form, "toTrackId") || null,
      transitionType: value(form, "transitionType"), mixOutPoint: value(form, "mixOutPoint"), mixInPoint: value(form, "mixInPoint"),
      eqTechnique: value(form, "eqTechnique"), fxNotes: value(form, "fxNotes"), timingNotes: value(form, "timingNotes"),
      notes: value(form, "notes"), rating: Number(value(form, "rating") || 0), difficulty: Number(value(form, "difficulty") || 0),
      practiceStatus: value(form, "practiceStatus"), lastPracticed: value(form, "lastPracticed"),
    };
    const ok = await mutate(item ? { type: "transition.update", id: item.id, expectedRevision: item.revision, input } : { type: "transition.create", input }, item ? "Geçiş güncellendi" : "Geçiş hafızaya eklendi");
    if (ok) close();
  }
  const defaultFrom = item?.fromTrackId ?? editor.fromTrackId ?? "";
  const defaultTo = item?.toTrackId ?? editor.toTrackId ?? "";
  return <Localized><form onSubmit={submit}><div className="form-grid">
    <Field label="Track A"><select name="fromTrackId" defaultValue={defaultFrom} required><option value=""><L text={"Parça seç"}/></option>{data.tracks.map((track) => <option key={track.id} value={track.id}>{track.title} — {track.artist}</option>)}</select></Field>
    <Field label="Track B"><select name="toTrackId" defaultValue={defaultTo} required><option value=""><L text={"Parça seç"}/></option>{data.tracks.map((track) => <option key={track.id} value={track.id}>{track.title} — {track.artist}</option>)}</select></Field>
    <Field label="Geçiş tipi"><input name="transitionType" defaultValue={item?.transitionType} maxLength={100} placeholder="Blend / Loop / Drop swap" /></Field>
    <Field label="Durum"><select name="practiceStatus" defaultValue={item?.practiceStatus ?? "idea"}><option value="idea"><L text={"Fikir"}/></option><option value="practice"><L text={"Çalışılıyor"}/></option><option value="ready"><L text={"Hazır"}/></option></select></Field>
    <Field label="Mix-out noktası"><input name="mixOutPoint" defaultValue={item?.mixOutPoint} maxLength={100} placeholder="Outro 16 bar" /></Field>
    <Field label="Mix-in noktası"><input name="mixInPoint" defaultValue={item?.mixInPoint} maxLength={100} placeholder="Intro 00:32" /></Field>
    <Field label="EQ tekniği" wide><input name="eqTechnique" defaultValue={item?.eqTechnique} maxLength={500} placeholder="Bass swap after 8 bars" /></Field>
    <Field label="Timing notu"><textarea name="timingNotes" rows={2} defaultValue={item?.timingNotes} maxLength={1000} /></Field>
    <Field label="FX / Loop"><textarea name="fxNotes" rows={2} defaultValue={item?.fxNotes} maxLength={1000} /></Field>
    <Field label="Kişisel not" wide><textarea data-localize-attrs="placeholder" name="notes" rows={3} defaultValue={item?.notes} maxLength={10000} placeholder="Neyin işe yaradığını veya neyi tekrar denemen gerektiğini yaz." /></Field>
    <Field label="Puan"><select name="rating" defaultValue={item?.rating ?? 0}><option value="0"><L text={"Puan yok"}/></option>{[1, 2, 3, 4, 5].map((number) => <option key={number} value={number}>{number}/5</option>)}</select></Field>
    <Field label="Zorluk"><select name="difficulty" defaultValue={item?.difficulty ?? 0}><option value="0"><L text={"Belirtilmedi"}/></option>{[1, 2, 3, 4, 5].map((number) => <option key={number} value={number}>{number}/5</option>)}</select></Field>
    <Field label="Son prova"><input name="lastPracticed" type="date" defaultValue={item?.lastPracticed} /></Field>
  </div><EditorFooter busy={busy} onCancel={close} /></form></Localized>;
}

function TrackPicker({ editor, close }: { editor: Extract<NonNullable<EditorState>, { kind: "picker" }>; close: () => void }) {
  const { data, mutate, busy } = useWorkspace();
  const [query, setQuery] = useState("");
  const target = editor.target === "crate" ? data.crates.find((crate) => crate.id === editor.targetId) : data.sets.find((set) => set.id === editor.targetId);
  const existing = new Set(editor.target === "crate" && target && "trackIds" in target ? target.trackIds : target && "tracks" in target ? target.tracks.map((item) => item.trackId) : []);
  const targetLabel = target ? ("name" in target ? target.name : target.title) : "Hedef";
  const needle = query.trim().toLocaleLowerCase("tr-TR");
  const results = data.tracks.filter((track) => !existing.has(track.id) && (!needle || `${track.title} ${track.artist} ${track.genre}`.toLocaleLowerCase("tr-TR").includes(needle)));
  return <Localized><div className="picker"><label className="search-field"><Search size={16} /><span className="sr-only"><L text={"Parça ara"}/></span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} data-localize-attrs="placeholder" placeholder="Library’de ara" /></label><div className="picker-list">{results.map((track) => <div key={track.id}><span><strong>{track.title}</strong><small>{track.artist || <L text={"Sanatçı yok"}/>} · {track.bpm ?? "—"} BPM · {track.musicalKey || "—"}</small></span><button className="button secondary" disabled={busy} onClick={() => mutate(editor.target === "crate" ? { type: "crate.track.add", crateId: editor.targetId, trackId: track.id } : { type: "set.track.add", setId: editor.targetId, trackId: track.id }, `${targetLabel} içine eklendi`)}><Plus size={14} /><L text={" Ekle"}/></button></div>)}{!results.length && <p className="muted-copy"><L text={"Eklenebilecek eşleşen parça kalmadı."}/></p>}</div><div className="editor-footer"><button className="button primary" onClick={close}><L text={"Tamam"}/></button></div></div></Localized>;
}

export function WorkspaceEditor({ editor, close }: { editor: EditorState; close: () => void }) {
  if (!editor) return null;
  const copy = editor.kind === "track"
    ? { title: editor.item ? "Parçayı düzenle" : editor.origin === "library" ? "Library’ye parça ekle" : "Keşif kaydet", description: "DJ açısından işine yarayacak bilgiyi şimdi ekle; ayrıntıları sonra tamamlayabilirsin." }
    : editor.kind === "crate"
      ? { title: editor.item ? "Crate’i düzenle" : "Yeni crate", description: "Aynı amaç için düşündüğün aday parçaları bir araya getir." }
      : editor.kind === "set"
        ? { title: editor.item ? "Seti düzenle" : "Yeni set", description: "Çalmayı planladığın bilinçli performans akışı için bir çalışma alanı aç." }
        : editor.kind === "transition"
          ? { title: editor.item ? "Geçişi düzenle" : "Geçiş hafızası oluştur", description: "Track A’dan Track B’ye kendi yaklaşımını kaydet." }
          : { title: "Library’den parça ekle", description: "Arayıp seç; aynı parça ikinci kez eklenmez." };
  return <Localized><Dialog open onOpenChange={(open) => { if (!open) close(); }}><DialogContent className={`workspace-editor${editor.kind === "track" || editor.kind === "transition" ? " wide-editor" : ""}`}><DialogTitle><L text={copy.title}/></DialogTitle><DialogDescription><L text={copy.description}/></DialogDescription>{editor.kind === "track" && <TrackEditor editor={editor} close={close} />}{editor.kind === "crate" && <CrateEditor editor={editor} close={close} />}{editor.kind === "set" && <SetEditor editor={editor} close={close} />}{editor.kind === "transition" && <TransitionEditor editor={editor} close={close} />}{editor.kind === "picker" && <TrackPicker editor={editor} close={close} />}</DialogContent></Dialog></Localized>;
}

export function WorkspaceDeleteDialog({ target, close }: { target: DeleteState; close: () => void }) {
  const { mutate, busy } = useWorkspace();
  if (!target) return null;
  const label = target.kind === "track" ? target.item.title : target.kind === "crate" ? target.item.name : target.kind === "set" ? target.item.title : `${target.item.fromLabel} → ${target.item.toLabel}`;
  const explanation = target.kind === "track" ? "Parça, crate ve set bağlantılarıyla ona bağlı geçişler kaldırılacak." : target.kind === "crate" ? "Crate kaldırılacak; içindeki parçalar Library’de kalacak." : target.kind === "set" ? "Set sırası kaldırılacak; parçalar ve Transition Memory kayıtları kalacak." : "Bu geçişe ait kişisel hazırlık notu kaldırılacak.";
  const current = target;
  async function remove() {
    const action = current.kind === "track" ? { type: "track.delete", id: current.item.id, expectedRevision: current.item.revision } : current.kind === "crate" ? { type: "crate.delete", id: current.item.id, expectedRevision: current.item.revision } : current.kind === "set" ? { type: "set.delete", id: current.item.id, expectedRevision: current.item.revision } : { type: "transition.delete", id: current.item.id, expectedRevision: current.item.revision };
    if (await mutate(action, "Kayıt silindi")) close();
  }
  return <Localized><AlertDialog open onOpenChange={(open) => { if (!open) close(); }}><AlertDialogContent><AlertDialogTitle>“{label}<L text={"” silinsin mi?"}/></AlertDialogTitle><AlertDialogDescription><L text={explanation}/></AlertDialogDescription><AlertDialogFooter><AlertDialogCancel disabled={busy}><L text={"Vazgeç"}/></AlertDialogCancel><button className="button danger" disabled={busy} onClick={remove}>{busy ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}<L text={" Sil"}/></button></AlertDialogFooter></AlertDialogContent></AlertDialog></Localized>;
}
