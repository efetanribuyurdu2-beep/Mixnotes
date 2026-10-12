import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function moduleFrom(entry){const result=await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const exp=await moduleFrom('lib/playlist-export.ts');
const track=(id,o={})=>({id,title:id,artist:'Artist',version:'',bpm:124,musicalKey:'8A',genre:'House',subgenre:'',energy:3,rating:4,tags:[],origin:'library',notes:'',cueNotes:'',introNotes:'',outroNotes:'',durationSeconds:300,label:'',dateAdded:'',updatedAt:'',revision:1,sources:[],...o});
const set={id:'s',title:'Friday <Club> & "Late"',genre:'',eventDate:'',notes:'',status:'draft',tracks:[],createdAt:'',updatedAt:'',revision:1};

test('Camelot keys become Rekordbox tonality names',()=>{
 assert.equal(exp.tonality('8A'),'Am');assert.equal(exp.tonality('8B'),'C');assert.equal(exp.tonality('12a'),'Dbm');assert.equal(exp.tonality('F# minor'),'F# minor');
});

test('M3U8 uses attached file names, the chosen folder and Windows separators',()=>{
 const tracks=[track('Strobe',{artist:'deadmau5'}),track('Opus',{artist:'Eric Prydz'})];
 const m3u=exp.buildM3U(set,tracks,'C:\\Music\\House',new Map([['Opus','02 Opus (Extended).flac']]));
 assert.match(m3u,/^#EXTM3U\r\n/);
 assert.ok(m3u.includes('#EXTINF:300,deadmau5 - Strobe\r\nC:\\Music\\House\\deadmau5 - Strobe.mp3'));
 assert.ok(m3u.includes('C:\\Music\\House\\02 Opus (Extended).flac'));
 assert.ok(exp.buildM3U(set,[track('A/B:C')],'').includes('Artist - A B C.mp3'));
 assert.equal(exp.safeFileName('Zirve saati · 12 Eki'),'Zirve saati 12 Eki');
 assert.equal(exp.safeFileName('Şarkı (Ünlü Mix)'),'Şarkı (Ünlü Mix)');
 assert.equal(exp.safeFileName('···'),'mixnotes-set');
});

test('Rekordbox XML escapes text, encodes locations and keeps playlist order',()=>{
 const tracks=[track('Ünlü & Şarkı',{cueNotes:'Drop at 1:04'}),track('Two',{bpm:null,rating:0})];
 const out=exp.buildRekordboxXml(set,tracks,[{fromTrackId:'Ünlü & Şarkı',toTrackId:'Two',transitionType:'Bass swap',mixOutPoint:'Outro',eqTechnique:''}],'/Users/dj/My Music');
 assert.ok(out.includes('Name="Friday &lt;Club&gt; &amp; &quot;Late&quot;"'));
 assert.ok(out.includes('Name="Ünlü &amp; Şarkı"'));
 assert.ok(out.includes('Tonality="Am"'));
 assert.ok(out.includes('AverageBpm="124.00"'));
 assert.ok(out.includes('AverageBpm="0.00"'));
 assert.ok(out.includes('Rating="204"'));
 assert.ok(out.includes('Comments="CUE Drop at 1:04 | → Bass swap · Outro"'));
 assert.ok(out.includes('Location="file://localhost/Users/dj/My%20Music/Artist%20-%20%C3%9Cnl%C3%BC%20%26%20%C5%9Eark%C4%B1.mp3"'));
 assert.ok(out.indexOf('<TRACK Key="1"/>')<out.indexOf('<TRACK Key="2"/>'));
 assert.equal(exp.fileUrl('C:\\Music\\a b.mp3'),'file://localhost/C:/Music/a%20b.mp3');
});
