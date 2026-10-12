"use client";
import { L, Localized } from "./localized";

import { useState } from "react";
import { Copy, Link2, Link2Off, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useWorkspace } from "./workspace-context";
import { translateUi } from "@/lib/ui-translations";
import type { MixSet } from "@/lib/workspace-types";

export function SetShareDialog({ set, open, onOpenChange }: { set: MixSet; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data, mutate, busy } = useWorkspace();
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const language = data.profile.language ?? "tr";
  const url = set.shareToken ? `${window.location.origin}/s/${set.shareToken}` : "";

  async function copy() {
    try { await navigator.clipboard.writeText(url); toast.success(translateUi("Bağlantı kopyalandı", language)); }
    catch { toast.error(translateUi("Kopyalanamadı; bağlantıyı seçip kopyala.", language)); }
  }
  async function share() {
    try { await navigator.share({ title: set.title, url }); } catch { /* dismissed */ }
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setConfirmRevoke(false); onOpenChange(value); }}>
      <DialogContent className="export-dialog">
        <Localized>
          <DialogTitle><L text="Seti paylaş" /></DialogTitle>
          <DialogDescription><L text="Bağlantıya sahip olan herkes set listesini görür: parça adı, sanatçı, BPM, key ve süre. DJ notların, cue'ların, puanların ve kaynakların gizli kalır." /></DialogDescription>
          {set.shareToken ? (
            <>
              <div className="share-url">
                <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} aria-label="Paylaşım bağlantısı" />
                <button className="button secondary" onClick={copy}><Copy size={15} /><L text="Kopyala" /></button>
              </div>
              <div className="optimizer-actions share-actions">
                {typeof navigator !== "undefined" && "share" in navigator && <button className="button primary" onClick={share}><Share2 size={15} /><L text="Paylaş" /></button>}
                <a className="button secondary" href={url} target="_blank" rel="noreferrer"><Link2 size={15} /><L text="Sayfayı aç" /></a>
                {confirmRevoke
                  ? <button className="button secondary danger-ghost" disabled={busy} onClick={() => mutate({ type: "set.unshare", setId: set.id }, "Paylaşım bağlantısı kaldırıldı")}><Link2Off size={15} /><L text="Evet, bağlantıyı kaldır" /></button>
                  : <button className="button secondary" onClick={() => setConfirmRevoke(true)}><Link2Off size={15} /><L text="Bağlantıyı kaldır" /></button>}
              </div>
              <p className="audio-local-note"><L text="Kaldırırsan eski bağlantı çalışmaz. Yeniden paylaşırsan yeni bir bağlantı oluşur." /></p>
            </>
          ) : (
            <div className="optimizer-actions">
              <button className="button secondary" onClick={() => onOpenChange(false)}><L text="Vazgeç" /></button>
              <button className="button primary" disabled={busy} onClick={() => mutate({ type: "set.share", setId: set.id }, "Paylaşım bağlantısı oluşturuldu")}><Link2 size={15} /><L text="Bağlantı oluştur" /></button>
            </div>
          )}
        </Localized>
      </DialogContent>
    </Dialog>
  );
}
