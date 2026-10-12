"use client";
import { L, Localized } from "./localized";

import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "./workspace-context";
import { generateFromTemplate, sampleCurve, setTemplates } from "@/lib/set-templates";
import { HarmonicBadge } from "./set-stage";

function Curve({ values, className = "" }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const points = values.map((v, i) => `${(i / (values.length - 1)) * 100},${36 - ((v - 1) / 4) * 32}`).join(" ");
  return <svg className={`template-curve ${className}`} viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} /></svg>;
}

export function SetTemplateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, mutate, busy, setSelectedSetId } = useWorkspace();
  const [templateId, setTemplateId] = useState(setTemplates[0].id);
  const template = setTemplates.find((t) => t.id === templateId)!;
  const [minutes, setMinutes] = useState(template.minutes);
  const [genre, setGenre] = useState("");
  const [title, setTitle] = useState("");
  const genres = useMemo(() => [...new Set(data.tracks.filter((t) => t.origin === "library" && t.genre.trim()).map((t) => t.genre.trim()))].sort(), [data.tracks]);
  const tracks = useMemo(() => generateFromTemplate(data.tracks, template, data.transitions, { minutes, genre }), [data.tracks, data.transitions, template, minutes, genre]);
  const total = Math.round(tracks.reduce((sum, t) => sum + (t.durationSeconds ?? 300), 0) / 60);
  const name = title.trim() || `${template.name} · ${new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`;

  function choose(id: string) {
    const next = setTemplates.find((t) => t.id === id)!;
    setTemplateId(id); setMinutes(next.minutes);
  }

  async function create() {
    await mutate({ type: "set.create", input: { title: name, genre, eventDate: "", notes: template.description, status: "draft" }, trackIds: tracks.map((t) => t.id) }, "Şablondan set oluşturuldu", (workspace) => {
      const newest = [...workspace.sets].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (newest) setSelectedSetId(newest.id);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="template-dialog">
        <Localized>
          <DialogTitle><L text="Şablondan set oluştur" /></DialogTitle>
          <DialogDescription><L text="Bir enerji eğrisi seç; MixNotes Library'nden bu eğriye ve akıcı geçişlere uyan parçaları sıralar. Sonra istediğin gibi düzenle." /></DialogDescription>
          <div className="template-grid" role="radiogroup" aria-label="Şablon">
            {setTemplates.map((t) => (
              <button key={t.id} role="radio" aria-checked={t.id === templateId} className={t.id === templateId ? "active" : ""} onClick={() => choose(t.id)}>
                <Curve values={t.energy} />
                <strong><L text={t.name} /></strong>
                <small><L text={t.description} /></small>
                <em>{t.minutes} dk</em>
              </button>
            ))}
          </div>
          <div className="template-fields">
            <label><span><L text="Set adı" /></span><input value={title} placeholder={name} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></label>
            <label><span><L text="Süre (dk)" /></span><input type="number" min={15} max={480} step={15} value={minutes} onChange={(e) => setMinutes(Math.min(480, Math.max(15, Number(e.target.value) || 15)))} /></label>
            <label><span><L text="Tür" /></span><select value={genre} onChange={(e) => setGenre(e.target.value)}><option value=""><L text="Tüm Library" /></option>{genres.map((g) => <option key={g} value={g}>{g}</option>)}</select></label>
          </div>
          <div className="template-preview">
            <div className="template-preview-head">
              <span><strong>{tracks.length}</strong> <L text="parça" /> · ~{total} dk</span>
              <span className="template-legend"><i className="is-target" /><L text="Hedef" /><i className="is-actual" /><L text="Seçilen" /></span>
            </div>
            <div className="template-preview-curves">
              <Curve values={tracks.map((_, i) => sampleCurve(template.energy, tracks.length > 1 ? i / (tracks.length - 1) : 0))} className="is-target" />
              <Curve values={tracks.map((t) => t.energy ?? 3)} className="is-actual" />
            </div>
            {tracks.length ? (
              <ol className="optimizer-list">
                {tracks.map((t, i) => (
                  <li key={t.id}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div><strong>{t.title}</strong><small>{t.artist} · {t.bpm ?? "—"} BPM · {t.musicalKey || "—"} · E{t.energy ?? "—"}</small></div>
                    {i > 0 && <HarmonicBadge from={tracks[i - 1]} to={t} />}
                  </li>
                ))}
              </ol>
            ) : <p className="muted-copy"><L text="Bu seçime uyan Library parçası yok. Türü değiştir veya Library'ye parça ekle." /></p>}
          </div>
          <div className="optimizer-actions">
            <button className="button secondary" onClick={() => onOpenChange(false)}><L text="Vazgeç" /></button>
            <button className="button primary" disabled={busy || !tracks.length} onClick={create}><L text="Seti oluştur" /></button>
          </div>
        </Localized>
      </DialogContent>
    </Dialog>
  );
}
