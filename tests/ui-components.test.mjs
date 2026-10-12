import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test, { after } from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const vite = await createServer({
  appType: "custom",
  configFile: false,
  root,
  resolve: { alias: { "@": root } },
  server: { middlewareMode: true },
});

after(async () => {
  await vite.close();
});

async function readCssTree(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return readCssTree(entryPath);
      }
      return entry.name.endsWith(".css") ? readFile(entryPath, "utf8") : "";
    }),
  );
  return contents.join("\n");
}

test("emits responsive workspace and reduced-motion safeguards", async () => {
  const css = await readCssTree(path.join(root, "dist"));

  assert.match(css, /--tw-enter-opacity/);
  assert.match(css, /scroll-fade-reveal-b/);
  assert.match(css, /mask-image:/);
  assert.match(css, /tw-shimmer/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /mobile-bottom-nav/);
  assert.match(css, /track-strip/);
  assert.match(css, /transition-memory-list/);
});

test("forwards progress semantics to the primitive", async () => {
  const { Progress } = await vite.ssrLoadModule("/components/ui/progress.tsx");
  const html = renderToStaticMarkup(React.createElement(Progress, { value: 37 }));

  assert.match(html, /aria-valuenow="37"/);
  assert.match(html, /aria-valuetext="37%"/);
  assert.match(html, /data-state="loading"/);
});

test("emits chart themes for the starter's media dark mode", async () => {
  const { ChartStyle } = await vite.ssrLoadModule("/components/ui/chart.tsx");
  const html = renderToStaticMarkup(
    React.createElement(ChartStyle, {
      id: "contract",
      config: {
        latency: { theme: { light: "#ffffff", dark: "#000000" } },
      },
    }),
  );

  assert.match(html, /\[data-chart=contract\]/);
  assert.match(html, /@media \(prefers-color-scheme: dark\)/);
  assert.doesNotMatch(html, /\.dark/);
});

test("renders sidebar skeletons deterministically", async () => {
  const { SidebarMenuSkeleton } = await vite.ssrLoadModule(
    "/components/ui/sidebar.tsx",
  );
  const first = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));
  const second = renderToStaticMarkup(React.createElement(SidebarMenuSkeleton));

  assert.equal(first, second);
  assert.match(first, /--skeleton-width:70%/);
});

test("renders the new discovery, smart collection, history and transfer screens with existing workspace data", async () => {
  const { WorkspaceProvider } = await vite.ssrLoadModule("/components/mixnotes/workspace-context.tsx");
  const data = {
    profile: { displayName: "DJ" }, tracks: [], sets: [], transitions: [],
    crates: [{ id: "crate", name: "Afro warm-up", description: "", trackIds: [], revision: 1, rules: { genre: "Afro House", tag: "", bpmMin: 120, bpmMax: 124, energyMin: null, ratingMin: 0, origin: "library" } }],
    sessions: [{ id: "session", kind: "performance", date: "2026-10-11", durationMinutes: 45, rating: 4, setTitle: "Family Party", transitionLabel: "", notes: "Clean mix", createdAt: "2026-10-11T00:00:00Z", setId: null, transitionId: null }],
    meta: { schemaVersion: 4, migratedLegacySets: 0 },
  };
  const context = { data, busy: false, selectedCrateId: "crate", setView() {}, setSelectedTrackId() {}, setSelectedCrateId() {}, openEditor() {}, requestDelete() {}, mutate: async () => true };
  for (const [file, exported, expected] of [
    ["discover-view", "DiscoverView", /Katalog araması/],
    ["crates-view", "CratesView", /SMART CRATE/],
    ["practice-view", "PracticeView", /Family Party/],
    ["transfer-view", "TransferView", /Tam yedek indir/],
  ]) {
    const module = await vite.ssrLoadModule(`/components/mixnotes/${file}.tsx`);
    const html = renderToStaticMarkup(React.createElement(WorkspaceProvider, { value: context }, React.createElement(module[exported])));
    assert.match(html, expected);
    if(file === "transfer-view"){assert.match(html,/MP3 \/ WAV içe aktar/);assert.match(html,/multiple/);assert.match(html,/audio\/mpeg/);}
    if(file === "practice-view")assert.match(html,/Transition Lab/);
  }
});

test("renders real waveform and a two-deck audition workspace without requiring audio at server render",async()=>{
 const {Waveform}=await vite.ssrLoadModule('/components/mixnotes/audio-attachment.tsx');
 const wave=renderToStaticMarkup(React.createElement(Waveform,{asset:{duration:120,peaks:[0,.2,.9,.4],name:'A.wav'},cue:40,overlap:16,deck:'A',onCue(){}}));
 assert.match(wave,/wave-cue/);assert.match(wave,/wave-overlap/);assert.match(wave,/A cue noktası/);assert.match(wave,/stroke/);
 const {WorkspaceProvider}=await vite.ssrLoadModule('/components/mixnotes/workspace-context.tsx');
 const {TransitionsView}=await vite.ssrLoadModule('/components/mixnotes/transitions-view.tsx');
 const tracks=[{id:'a',title:'Track A',artist:'Artist',bpm:120},{id:'b',title:'Track B',artist:'Artist',bpm:124}];
 const data={profile:{displayName:'DJ',storageKey:'test-owner'},tracks,sets:[],transitions:[],crates:[],sessions:[],meta:{schemaVersion:4}};
 const html=renderToStaticMarkup(React.createElement(WorkspaceProvider,{value:{data,busy:false,mutate:async()=>true}},React.createElement(TransitionsView)));
 assert.match(html,/Transition Lab/);assert.match(html,/Çıkış parçası/);assert.match(html,/Giriş parçası/);assert.match(html,/Geçişi dinle/);assert.match(html,/Bulut kopyasını ayrıca kaydedebilirsin/);assert.match(html,/MP3 \/ WAV ekle/);
});


test("English screens translate UI while preserving user content and native form values",async()=>{
 const {WorkspaceProvider}=await vite.ssrLoadModule('/components/mixnotes/workspace-context.tsx');
 const {LanguageContext}=await vite.ssrLoadModule('/components/mixnotes/localized.tsx');
 const data={profile:{displayName:'DJ',storageKey:'test-owner',language:'en',avatarId:'cat'},tracks:[],sets:[],transitions:[],crates:[{id:'crate',name:'Hazır',description:'Parça adı',trackIds:[],revision:1}],sessions:[],meta:{schemaVersion:4}};
 const context={data,busy:false,selectedCrateId:'crate',setView(){},setSelectedTrackId(){},setSelectedCrateId(){},openEditor(){},requestDelete(){},mutate:async()=>true};
 const render=child=>renderToStaticMarkup(React.createElement(LanguageContext.Provider,{value:'en'},React.createElement(WorkspaceProvider,{value:context},child)));
 for(const [file,name,expected]of [['transfer-view','TransferView',/Import MP3 \/ WAV/],['practice-view','PracticeView',/Hear your transition/],['discover-view','DiscoverView',/Find your next sound/],['library-view','LibraryView',/Your tracks and discoveries/],['sets-view','SetsView',/Arrange your flow/]]){
  const module=await vite.ssrLoadModule(`/components/mixnotes/${file}.tsx`);
  assert.match(render(React.createElement(module[name])),expected);
 }
 const {CratesView}=await vite.ssrLoadModule('/components/mixnotes/crates-view.tsx');
 const html=render(React.createElement(CratesView));
 assert.match(html,/Collect your next tracks/);assert.match(html,/>Hazır</);assert.match(html,/>Parça adı</);
 const {WorkspaceEditor}=await vite.ssrLoadModule('/components/mixnotes/editors.tsx');
 const editor=render(React.createElement(WorkspaceEditor,{editor:{kind:'track',origin:'library'},close(){}}));
 // Dialogs are portalled client-side; directly verify attribute localization separately.
 const {Localized,L}=await vite.ssrLoadModule('/components/mixnotes/localized.tsx');
 const native=render(React.createElement(Localized,null,React.createElement('input',{'data-localize-attrs':'placeholder',placeholder:'Parça adı',defaultValue:'Hazır'}),React.createElement(L,{text:'Parça adı'})));
 assert.match(native,/placeholder="Track title"/);assert.match(native,/value="Hazır"/);assert.match(native,/Track title/);
 const {avatars}=await vite.ssrLoadModule('/lib/avatars.ts');assert.equal(avatars.length,5);assert.equal(new Set(avatars.map(a=>a.id)).size,5);
 const {AvatarArt}=await vite.ssrLoadModule('/components/mixnotes/profile-avatar.tsx');
 const art=avatars.map(a=>render(React.createElement(AvatarArt,{id:a.id})));assert.equal(new Set(art).size,5);
});

test("renders pilot plans, founder tools and genuine multicolor waveforms in English",async()=>{
 const {WorkspaceProvider}=await vite.ssrLoadModule('/components/mixnotes/workspace-context.tsx');
 const {LanguageContext}=await vite.ssrLoadModule('/components/mixnotes/localized.tsx');
 const {PlansView,StudioToolsView}=await vite.ssrLoadModule('/components/mixnotes/studio-tools.tsx');
 const data={profile:{displayName:'DJ',membership:{plan:'founder',fullAccess:true}},tracks:[],sets:[],crates:[],transitions:[],sessions:[],meta:{schemaVersion:4,migratedLegacySets:0}};
 const wrap=component=>React.createElement(LanguageContext.Provider,{value:'en'},React.createElement(WorkspaceProvider,{value:{data,busy:false,setView(){},mutate:async()=>true}},React.createElement(component)));
 const plans=renderToStaticMarkup(wrap(PlansView));assert.match(plans,/Founder account/);assert.match(plans,/no payment is collected/);assert.match(plans,/not available yet/);
 const tools=renderToStaticMarkup(wrap(StudioToolsView));assert.match(tools,/My technique notebook/);assert.match(tools,/DDJ-FLX2/);assert.match(tools,/DDJ-FLX4/);assert.match(tools,/provider account not connected/);
 const {Waveform}=await vite.ssrLoadModule('/components/mixnotes/audio-attachment.tsx');const waveform=renderToStaticMarkup(React.createElement(Waveform,{asset:{name:'Own song',duration:1,peaks:[0,.7,1,.2],file:new Blob(),key:'test',addedAt:''}}));assert.match(waveform,/linearGradient/);for(const color of ['#ffae85','#f4a9ce','#b89cf5','#8ed9c1'])assert.ok(waveform.includes(color));assert.match(waveform,/M125.00,60V60/);
});

test('saved source buttons open in-app players and players load only after an explicit action',async()=>{
 const {WorkspaceProvider}=await vite.ssrLoadModule('/components/mixnotes/workspace-context.tsx');const {ProviderPlayer,SourcePlayerButton}=await vite.ssrLoadModule('/components/mixnotes/provider-player.tsx');const context={data:{profile:{displayName:'DJ',language:'en'},tracks:[],crates:[],sets:[],transitions:[],sessions:[]}};
 const {LanguageContext}=await vite.ssrLoadModule('/components/mixnotes/localized.tsx');const render=component=>renderToStaticMarkup(React.createElement(LanguageContext.Provider,{value:'en'},React.createElement(WorkspaceProvider,{value:context},component))); const url='https://open.spotify.com/track/0Lr4kGOYn9l83EjuK6cZFQ';
 let html=render(React.createElement(ProviderPlayer,{url}));assert.match(html,/Listen in app/);assert.match(html,/Copy link/);assert.doesNotMatch(html,/<iframe/);assert.match(html,/target="_top"/);
 html=render(React.createElement(SourcePlayerButton,{url,label:'Spotify'}));assert.match(html,/<button/);assert.match(html,/Spotify/);assert.doesNotMatch(html,/<iframe/);
 html=render(React.createElement(ProviderPlayer,{url:'https://www.beatport.com/track/song/123'}));assert.match(html,/requires provider access/);assert.doesNotMatch(html,/Listen in app|<iframe/);
});

test('editable waveforms expose a cue slider and set readiness never claims audio is checked at server render',async()=>{
 const {Waveform}=await vite.ssrLoadModule('/components/mixnotes/audio-attachment.tsx');const html=renderToStaticMarkup(React.createElement(Waveform,{asset:{duration:100,peaks:[0,.3,.8],key:'k'},cue:20,onCue(){}}));assert.match(html,/is-editable/);assert.match(html,/type="range"/);assert.match(html,/value="20"/);assert.match(html,/Cue çizgisini sürükle/);
 const {WorkspaceProvider}=await vite.ssrLoadModule('/components/mixnotes/workspace-context.tsx');const {SetReadiness}=await vite.ssrLoadModule('/components/mixnotes/set-readiness.tsx');const data={profile:{storageKey:'owner'},tracks:[{id:'track',title:'Prepared song',bpm:120,musicalKey:'8A',cueNotes:'0:12'}],sets:[{id:'set',tracks:[{trackId:'track'}]}],transitions:[]};const ready=renderToStaticMarkup(React.createElement(WorkspaceProvider,{value:{data}},React.createElement(SetReadiness,{setId:'set'})));assert.match(ready,/0\/1/);assert.match(ready,/Ses kontrolü bekleniyor/);assert.doesNotMatch(ready,/is-ready/);
});
