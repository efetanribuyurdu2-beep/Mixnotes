"use client";
import { useEffect, useRef, useState } from 'react';
import { ExternalSourceActions } from './provider-player';
import { L, Localized } from './localized';
import { useWorkspace } from './workspace-context';
import { saveLocalAudio } from '@/lib/local-audio';

type Output = { name: string; url: string };
const running = (status: string) => ['QUEUED', 'STARTED', 'PROCESSING', 'RUNNING'].includes(status);

// Provider output names vary by workflow; map the common ones onto the Stem Mixer's four lanes.
export function stemLane(name: string): 'vocals' | 'drums' | 'bass' | 'other' | null {
  const n = name.toLowerCase();
  if (/vocal|voice/.test(n)) return 'vocals';
  if (/drum|perc/.test(n)) return 'drums';
  if (/bass/.test(n)) return 'bass';
  if (/other|instrument|accomp|rest|music/.test(n)) return 'other';
  return null;
}

export function ProviderPanel() {
  const { data } = useWorkspace();
  const [configured, setConfigured] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [job, setJob] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [outputs, setOutputs] = useState<Output[]>([]);
  const [trackId, setTrackId] = useState(data.tracks[0]?.id ?? '');
  const [attached, setAttached] = useState('');
  const poll = useRef<number | undefined>(undefined);

  useEffect(() => {
    fetch('/api/stems').then(r => r.json() as Promise<{ configured: boolean }>).then(v => setConfigured(v.configured)).catch(() => setStatus('Sağlayıcı durumu alınamadı.'));
    return () => window.clearTimeout(poll.current);
  }, []);

  async function run() {
    setBusy(true);
    try {
      const r = await fetch(job ? `/api/stems?job=${encodeURIComponent(job)}` : '/api/stems', job ? {} : { method: 'POST', headers: { 'Content-Type': file?.type || 'application/octet-stream', 'x-audio-consent': 'yes' }, body: file });
      const v = await r.json() as { id: string; status: string; outputs?: Output[]; error?: string };
      if (!r.ok) throw Error(v.error || 'İşlem tamamlanamadı.');
      setJob(v.id); setStatus(v.status); setOutputs(v.outputs || []);
      // Keep checking automatically while the provider is still working.
      window.clearTimeout(poll.current);
      if (running(v.status)) poll.current = window.setTimeout(() => void run(), 6000);
    } catch (e) { setStatus((e as Error).message); }
    finally { setBusy(false); }
  }

  async function attach() {
    const owner = data.profile.storageKey;
    if (!owner || !trackId) return;
    setBusy(true); setAttached('');
    let added = 0;
    try {
      for (const output of outputs) {
        const lane = stemLane(output.name);
        if (!lane) continue;
        const response = await fetch(`/api/stems?job=${encodeURIComponent(job)}&output=${encodeURIComponent(output.name)}`);
        if (!response.ok) throw Error('Stem dosyası sağlayıcıdan alınamadı. Bağlantının süresi dolmuş olabilir.');
        const blob = await response.blob();
        const extension = /mpeg|mp3/.test(blob.type) ? 'mp3' : /flac/.test(blob.type) ? 'flac' : 'wav';
        await saveLocalAudio(owner, `${trackId}:stem:${lane}`, new File([blob], `${lane}.${extension}`, { type: blob.type }));
        added += 1;
      }
      setAttached(added ? `${added} stem Stem Mixer'a eklendi.` : 'Çıktılarda vokal/davul/bass/diğer stem’i bulunamadı.');
    } catch (e) { setAttached((e as Error).message); }
    finally { setBusy(false); }
  }

  const done = status === 'SUCCEEDED' && outputs.length > 0;
  return <Localized><section className="tool-card">
    <p className="overline">Audio Providers</p>
    <h3>Music AI · Stem separation</h3>
    <p><L text={configured ? 'Sağlayıcı bağlı.' : 'Bağlantı hazır · sağlayıcı hesabı henüz bağlı değil.'} /></p>
    <p><L text="Vokal, davul, bass ve enstrüman ayırma için Music AI. İşlem harici sunucuda yapılır; sağlayıcı ücretleri ayrıca geçerlidir." /></p>
    {configured && <>
      <input type="file" accept="audio/*,.mp3,.wav" onChange={e => { const f = e.target.files?.[0] || null; if (f && f.size > 25 * 1024 * 1024) { setStatus('En fazla 25 MB.'); return; } window.clearTimeout(poll.current); setFile(f); setJob(''); setOutputs([]); setAttached(''); }} />
      <label className="mix-checkbox"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><L text="Bu ses dosyasının Music AI’a gönderilmesini kabul ediyorum." /></label>
      <button className="button secondary" disabled={busy || !data.profile.membership?.fullAccess || (!job && (!file || !consent))} onClick={() => void run()}><L text={job ? 'Sonucu kontrol et' : 'Stem ayırmayı başlat'} /></button>
    </>}
    <p role="status">{status && <L text={running(status) ? 'İşleniyor… Sonuç otomatik kontrol ediliyor.' : status} />}</p>
    {outputs.map(o => <div key={o.name}><a href={o.url} target="_top" rel="noreferrer">{o.name} ↗</a><audio controls preload="none" src={o.url} /></div>)}
    {done && <div className="stem-attach">
      <label><L text="Stem'lerin ekleneceği parça" /><select value={trackId} onChange={e => setTrackId(e.target.value)}>{data.tracks.map(t => <option key={t.id} value={t.id}>{t.title} · {t.artist}</option>)}</select></label>
      <button className="button primary" disabled={busy || !trackId} onClick={() => void attach()}><L text="Stem'leri Stem Mixer'a ekle" /></button>
      {attached && <p role="status"><L text={attached} /></p>}
    </div>}
    <ExternalSourceActions url="https://music.ai/platform/api/" label="Music AI" />
    <hr />
    <h4>Audius · streaming candidate</h4>
    <p><L text="Katalog sağlayıcısı adayı. API erişimi ve kullanım hakları doğrulanmadan Transition Lab ses kaynağı olarak etkinleştirilmedi." /></p>
    <ExternalSourceActions url="https://docs.audius.co/api/" label="Audius API" />
  </section></Localized>;
}
