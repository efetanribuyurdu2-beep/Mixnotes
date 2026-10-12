// UI copy only. Track titles, artists, notes and other user content stay unchanged.
export type Language = 'tr' | 'en';
const entries = `
Önceden aktarılan Spotify parçalarının kapak ve albüm bilgilerini tamamla. Spotify hesabın bağlı olmalı; DJ notların ve cue ayarların korunur.|Complete the artwork and album details for previously imported Spotify tracks. Connect your Spotify account first; DJ notes and cues are preserved.
Spotify kapak ve bilgilerini tamamla|Complete Spotify artwork and details
Bilgiler güncelleniyor…|Updating details…
Spotify kapak ve bilgileri yenilendi|Spotify artwork and details updated
Bu parça için sana ait Spotify kaynağı bulunamadı.|No Spotify source belonging to you was found for this track.
Spotify bu parçanın bilgilerini döndürmedi.|Spotify did not return details for this track.

Ses gelmiyor mu?|No sound?
Uygulama içindeki tarayıcı ses oynatıcısına izin vermeyebilir. MixNotes’u Safari’de açıp aynı parçayı tekrar seçebilirsin.|The in-app browser may restrict audio playback. Open MixNotes in Safari and select the same track again.
Oynatıcıdaki Play düğmesine dokun. Ses gelmezse kaynağın erişim izinlerini ve cihazın sesini kontrol et.|Tap Play in the player. If you hear nothing, check source access permissions and your device volume.
MixNotes’u tarayıcıda aç|Open MixNotes in browser
Site bağlantısını kopyala|Copy site link
Safari’de açılacak site bağlantısı|Site link to open in Safari
Bağlantı kopyalandı. Safari’nin adres çubuğuna yapıştırabilirsin.|Link copied. Paste it into Safari's address bar.
Ses dosyaları cihaz ve tarayıcıya özeldir. Yerel MP3 / WAV için Safari’de dosyayı yeniden seçmen gerekebilir; Library kaydın korunur.|Audio files belong to this device and browser. You may need to select your local MP3 / WAV again in Safari; your Library record is preserved.
Cue çizgisini sürükle veya waveform’a dokun. Altındaki sürgüyle de ince ayar yapabilirsin.|Drag the cue line or tap the waveform. Use the slider below for fine adjustments.
Tekrar et. Dinle. Karşılaştır.|Repeat. Listen. Compare.
Geçişi tekrarla|Repeat transition
Prova bitince aynı geçiş yeniden başlar. Cue veya efekti değiştirmek için önce durdur.|The same transition restarts when the rehearsal ends. Stop first to change cues or effects.
Prova kaydı hazırlanıyor…|Preparing rehearsal recording…
Miks provasını WAV olarak hazırla|Render mix rehearsal as WAV
WAV kaydını indir|Download WAV recording
Bu kayıt seçtiğin dosyalar, cue noktaları ve efektlerden bu cihazda oluşturulur. Mikrofon veya Spotify sesi kaydedilmez. Ayar değişince önceki prova temizlenir; saklamak için indir.|This recording is rendered on this device from your selected files, cues and effects. It does not record your microphone or Spotify. Changing settings clears the previous rehearsal; download it to keep it.
Bu ayarı sakla|Store these settings
İlk ayarı A’ya, alternatifini B’ye sakla. İkisini sırayla dinle; değiştirmek için önce durdur. Bu hızlı karşılaştırma oturum boyunca saklanır.|Store the first settings in A and the alternative in B. Listen to each in turn; stop before switching. This quick comparison lasts for this session.
Library kaydı eksik|Missing Library record
Ses dosyası eksik|Missing audio file
BPM eksik|Missing BPM
Key eksik|Missing key
Cue noktası eksik|Missing cue point
Geçiş provası gerekli|Transition rehearsal needed
Ses kontrolü bekleniyor|Audio check pending
Hazırlık kontrolü metadata, cue notları ve hazır işaretlediğin geçişlere dayanır. Ses uyumunu dinleyerek doğrula; ses dosyaları bu tarayıcı için kontrol edilir.|Readiness uses metadata, cue notes and transitions you marked ready. Listen to confirm audio compatibility. Audio files are checked for this browser.
Ses arşivi kontrol ediliyor…|Checking audio library…
Bu tarayıcıdaki ses arşivi kontrol edilemedi. Dosyaları Library’den kontrol et.|Could not check this browser's audio storage. Check your files in Library.
Hazırlığı kontrol etmek için sete parça ekle.|Add tracks to the set to check readiness.
Library’de tamamla|Complete in Library
Geçişi hazırla|Prepare transition
Prova kaydı hazırlanamadı.|Could not render rehearsal recording.

Kaynak masası|Source desk
Entegrasyonu aç|Open integration
Resmi oynatıcı|Official player
Uygulama içinde dinle|Listen in app
Oynatıcıyı kapat|Close player
Kaynakta aç|Open source
Bağlantıyı kopyala|Copy link
Kaynak bağlantısı|Source URL
Bağlantı kopyalandı.|Link copied.
Bağlantıyı seçtim; kopyalayıp tarayıcında açabilirsin.|Link selected. Copy it and open it in your browser.
Bu kaynağın geçerli HTTPS bağlantısı yok.|This source has no valid HTTPS URL.
Kaynağı MixNotes içinden dinle veya bağlantısını aç.|Listen to the source inside MixNotes or open its link.
Dinleme süresi ve erişim kaynak hesabına ve parçanın izinlerine bağlıdır. Bu oynatıcı Transition Lab miksine veya stem analizine ses vermez.|Listening duration and access depend on your source account and track permissions. This player does not provide audio for Transition Lab or stem analysis.
Bu kaynak için anahtarsız resmi oynatıcı yok veya bağlantı desteklenmiyor. Tam streaming entegrasyonu için sağlayıcı erişimi gerekiyor.|No official key-free player is available for this source, or the URL is unsupported. Full streaming integration requires provider access.
Parça ve playlist bağlantıları için resmi oynatıcı anahtarsız çalışır. Hesap bağlantısı playlistlerini MixNotes’a aktarır; ses dosyası indirmez.|Official players for track and playlist links work without a key. Account linking imports your playlists into MixNotes; it does not download audio files.
Bağlantı kontrol ediliyor…|Checking connection…
Spotify hesabın bağlı.|Your Spotify account is connected.
Spotify hesap bağlantısı hazır.|Spotify account linking is ready.
Spotify hesap bağlantısı için Client ID gerekiyor.|Spotify account linking requires a Client ID.
Kurucu · Spotify bağlantı ayarları|Founder · Spotify connection settings
Spotify Developer Dashboard’da Web API uygulaması oluştur. Aşağıdaki Redirect URI’yi aynen ekle ve Client ID’yi kaydet. Client Secret gerekmiyor. Developer Mode’da kullanacak hesapları test kullanıcısı olarak ekle.|Create a Web API app in Spotify Developer Dashboard. Add the exact Redirect URI below and save its Client ID. No Client Secret is needed. In Developer Mode, add the accounts you will use as test users.
Client ID’yi kaydet|Save Client ID
Spotify hesabını bağla|Connect Spotify account
Playlistlerimi göster|Show my playlists
Hesap bağlantısını kaldır|Disconnect account
Spotify’da ara|Search Spotify
Spotify’da sanatçı veya parça ara…|Search Spotify for an artist or track…
Daha fazla playlist|More playlists
Spotify Developer Mode playlist içeriğini sahiplik ve test hesabı izinlerine göre sınırlar. İzin verilmeyen bir playlist oynatıcıdan dinlenebilir; içeriği aktarılamayabilir.|Spotify Developer Mode limits playlist content by ownership and test account permissions. You may be able to listen to a playlist in the player even when its content cannot be imported.
Dinle|Listen
Seçilenleri Library’ye ekle|Add selected tracks to Library
Daha fazla parça|More tracks
Yükleniyor…|Loading…
Spotify oynatıcısı Transition Lab miksine ses sağlamaz. Miks ve waveform için kendi MP3 / WAV dosyanı ekle.|The Spotify player does not provide audio for Transition Lab. Add your own MP3 / WAV for mixing and waveforms.
Oynatıcıyı aç|Open player
Resmi oynatıcı · playlist aktarımı|Official player · playlist import
Anahtarsız resmi parça ve playlist oynatıcısı|Official track and playlist player without a key
API bağlantısıyla gerçek stem ayırma|Real stem separation with an API connection
Katalog · streaming için sağlayıcı erişimi|Catalogue · streaming requires provider access
Kataloğu aç|Open catalogue
SoundCloud parça veya playlist bağlantısını yapıştır. Resmi oynatıcı MixNotes içinde açılır; özel veya izin verilmeyen parçalar çalmayabilir.|Paste a SoundCloud track or playlist URL. The official player opens inside MixNotes. Private or restricted tracks may not play.
Beatport kataloğunu açabilir ve parça bağlantılarını kaydedebilirsin. Tam streaming entegrasyonu için Beatport sağlayıcı onayı gerekiyor.|Open the Beatport catalogue and save track links. Full streaming integration requires Beatport provider approval.
Bu servisin üyeliği MixNotes’a bağlı değil. Bağlantıyı açabilir veya kopyalayabilirsin.|This service account is not linked to MixNotes. You can open or copy its URL.
Bağlantıyı aç|Open link
Spotify verileri alınamadı.|Could not load Spotify data.
Spotify bu hesaba veya playlist içeriğine izin vermedi. Developer Mode test kullanıcısını ve playlist sahipliğini kontrol et.|Spotify denied access to this account or playlist content. Check Developer Mode test users and playlist ownership.
Spotify bağlantısı tamamlanamadı. Client ID, Redirect URI ve test hesabı izinlerini kontrol et.|Could not complete Spotify connection. Check the Client ID, Redirect URI and test account permissions.
Önce Spotify hesabını bağla.|Connect your Spotify account first.
Spotify oturumu sona erdi. Hesabını yeniden bağla.|Your Spotify session expired. Reconnect your account.
Spotify bağlantısı tamamlanamadı.|Could not complete Spotify connection.
Spotify istek sınırına ulaşıldı. Biraz sonra tekrar dene.|Spotify's request limit was reached. Try again shortly.
Spotify verileri alınamadı. Tekrar dene.|Could not load Spotify data. Try again.

Camelot uyumu|Camelot compatibility
İki özgün pratik parçası hazır. Transition Lab’de seç.|Two original practice tracks are ready. Select them in Transition Lab.

Kurucu yönetimi|Founder controls
Plan vitrininin kontrolü sende.|Control your plan showcase.
Pro planı göster|Show Pro plan
Academy planı göster|Show Academy plan
Aylık pilot fiyat · USD|Monthly pilot price · USD
Yıllık pilot fiyat · USD|Yearly pilot price · USD
Plan görünümünü kaydet|Save plan display
Bu ayarlar planların görünümünü değiştirir; ödeme başlatmaz ve kurucu erişimini kısıtlamaz.|These settings change plan visibility. They do not start payments or restrict founder access.

Stem’lerle geçiş yap|Mix transitions with stems
Ana dosyanın yerine ayrı stem’leri miksle. Waveform ana dosyayı gösterir. Stem’ler aynı başlangıç ve süreyle dışa aktarılmalı; bu katman ayarları geçiş versiyonuna dahil değildir.|Mix separate stems instead of the main file. The waveform shows the main file. Stems must have the same start and duration; these layer settings are not included in transition versions.
Stem kaynağını kullan|Use stem source
Stem dosyalarını düzenle|Edit stem files

Komut eşlemek için Transition Lab’i aç.|Open Transition Lab to map commands.
Versiyon adı|Version name
Notlar|Notes
Teknik adı|Technique name

Planlar|Plans
Setine değer kat.|Make every set count.
Kurucu hesabı · Tüm özelliklere ve sınırsız hazırlık kaydına erişimin var.|Founder account · Full access to every feature and unlimited preparation records.
Free hesabın aktif. Ödeme ve ücretli abonelik henüz açılmadı.|Your Free account is active. Payments and paid subscriptions are not available yet.
200 parça · 3 aktif set|200 tracks · 3 active sets
Library, crates ve geçiş notları|Library, crates and transition notes
Yerel ses ile temel pratik|Basic practice with local audio
CSV / JSON dışa aktarımı|CSV / JSON export
Sınırsız hazırlık kaydı|Unlimited preparation records
Gerekçeli parça önerileri ve set taslağı|Track suggestions with reasons and set drafts
Geçiş alternatifleri ve A/B karşılaştırma|Transition alternatives and A/B comparisons
Pratik programları, kayıt analizi ve teknik defteri|Practice programmes, recording analysis and technique notebook
1 GB özel bulut ses arşivi|1 GB private cloud audio archive
Eğitmen ve öğrenci çalışma alanları|Instructor and student workspaces
Ödevler, zaman damgalı yorumlar ve roller|Assignments, timestamped comments and roles
İnsan geri bildirimi ve ortak çalışma|Human feedback and collaboration
Aktif|Active
Pilot fiyat önerisi · ödeme alınmaz|Pilot price proposal · no payment is collected
Planlanan hizmet · henüz kullanıma açık değil|Planned service · not available yet
Araçları keşfet|Explore tools
Daha hazır. Daha rahat.|Better prepared. More confident.
Kendi Library’nden öneriler, somut pratik görevleri ve kontrolcüyle çalışma.|Suggestions from your Library, practical exercises and controller practice.
Pro araçları pilot aşamasında. Kurucu hesabı tüm araçları kullanabilir.|Pro tools are in pilot. Founder accounts can use every tool.
Sıradaki parça|Next track
Aynı key|Same key
Yakın enerji|Similar energy
Karşılaştırma için daha fazla metadata gerekli.|More metadata is needed for comparison.
Öneriler BPM, key, enerji ve kendi puanlarına dayanır; ses uyumunu dinleyerek doğrula.|Suggestions use BPM, key, energy and your ratings. Listen to confirm compatibility.
Süreye göre set taslağı|Build a set for your time slot
Hedef dakika|Target minutes
Hedef enerji|Target energy
Süresi olmayan parçalar 4 dakika varsayılır. Sıralama öneridir; otomatik beatgrid değildir.|Tracks without duration are estimated at 4 minutes. The order is a suggestion, not an automatic beatgrid.
Taslağı set olarak kaydet|Save draft as a set
Set hazırlık kontrolü|Set readiness check
Kontrolcü pratik notlarını indir|Download controller practice notes
Bu dosya pratik rehberidir. rekordbox/djay içine hot cue veya müzik dosyası aktarmaz; aynı parçaları DJ uygulamana ayrıca ekle.|This file is a practice guide. It does not import hot cues or music into rekordbox/djay. Add the same tracks to your DJ app separately.
Prova kaydını incele|Analyse a practice recording
Kayıt seç|Choose recording
Ölçüm bu cihazda yapılır. Seviye ve olası clipping göstergesidir; LUFS, beatmatch doğruluğu veya insan değerlendirmesi değildir.|Analysis runs on this device. It reports levels and possible clipping, not LUFS, beatmatching accuracy or human feedback.
Pratik programları|Practice programmes
İki yakın BPM’li parça seç.|Choose two tracks with similar BPM.
8 bar örtüşme ayarla; giriş cue noktasını dinleyerek hizala.|Set an 8-bar overlap and align the entry cue by listening.
Blend ve bass swap seçeneklerini sırayla dinle.|Listen to blend and bass swap in turn.
Sonucu puanla ve bir alternatif kaydet.|Rate the result and save an alternative.
Enerjisi yükselen iki parça seç.|Choose two tracks with rising energy.
High-pass ve echo çıkışını karşılaştır.|Compare high-pass and echo-out.
Vokal çakışmasını dinle; cue noktasını değiştir.|Listen for vocal clashes and adjust the cue.
Kontrolcüde aynı hareketi yeniden uygula.|Repeat the same movement on your controller.
İki parçanın ilk güçlü vuruşunu bul.|Find the first strong beat of each track.
4 bar veya 8 bar süreyi dene.|Try a 4-bar or 8-bar duration.
Cut ve dip geçişini karşılaştır.|Compare cut and dip transitions.
Prova kaydını dinle ve not ekle.|Listen to your practice recording and add notes.
Teknik defterim|My technique notebook
Tekniği kaydet|Save technique
Kontrolcünle prova yap|Practise with your controller
Düğmeler MIDI öğrenme ile eşlenir. Hazır fabrika eşlemesi değildir; jog wheel, kulaklık cue ve ses kartı yönlendirmesi bu sürümde yoktur.|Map buttons with MIDI Learn. This is not a factory mapping; jog wheels, headphone cue and audio interface routing are not included in this version.
MIDI bağla|Connect MIDI
MIDI girişi seç|Choose MIDI input
Kontrolcüde eşlemek istediğin düğmeye bas.|Press the button you want to map on your controller.
Bu tarayıcı Web MIDI sunmuyor. iPad’de rekordbox veya djay ile FLX2 / FLX4 kullan; MixNotes’u hazırlık ve pratik notları için yanında aç. Doğrudan MIDI için destekleyen masaüstü tarayıcı kullan.|This browser does not provide Web MIDI. On iPad, use FLX2 / FLX4 with rekordbox or djay and keep MixNotes open for preparation and practice notes. Direct MIDI requires a supported desktop browser.
Kontrol eşlendi.|Control mapped.
MIDI girişi hazır.|MIDI input ready.
USB kontrolcüyü bağla.|Connect your USB controller.
MIDI izni verilmedi veya bağlantı kullanılamıyor.|MIDI permission was denied or the connection is unavailable.
Alternatifini sakla. Karşılaştır.|Save an alternative. Compare it.
Yeni versiyon kaydet|Save a new version
Versiyonu seçip Geçişi dinle’ye bas. Her versiyon cue, efekt, süre ve tempo ayarlarını ayrı saklar.|Select a version, then press Listen to transition. Each version stores its own cues, effect, duration and tempo settings.
Ayrı vokal, davul, bass ve diğer stem dosyalarını ekle. Bu araç dosyayı otomatik ayırmaz; Music AI çıktısını veya kendi stem’lerini kullan.|Add separate vocal, drum, bass and other stem files. This tool does not separate audio automatically. Use Music AI outputs or your own stems.
Stem’leri dinle|Listen to stems
High-pass yükseliş|High-pass rise
Low-pass düşüş|Low-pass fall
Echo çıkış|Echo out
Özel bulut ses arşivi · 1 GB · Dosya başına 25 MB|Private cloud audio archive · 1 GB · 25 MB per file
Bu cihaza al|Restore to this device
Bulut kopyasını kaldır|Remove cloud copy
Sesin bulut kopyasını kaydet|Save a cloud copy of the audio
Bulut kopyası bu cihaza alındı.|Cloud copy restored to this device.
Bulut kopyası hazır.|Cloud copy ready.
Bulut kopyası kaldırıldı.|Cloud copy removed.
Ses bu açık oturumda hazır.|Audio is ready in this session.
Ses dosyası önce bu cihazda saklanır. Bulut kopyasını ayrıca kaydedebilirsin. Ses JSON yedeğine dahil değildir. Yerel dosya: en fazla 50 MB / 15 dakika.|Audio is stored on this device first. You can save a cloud copy separately. Audio is not included in JSON backups. Local file limit: 50 MB / 15 minutes.
Müziksiz başlamana gerek yok.|Start practising right away.
İki özgün ritim egzersizi oluştur. 40 saniyelik bu örnekler ticari bir kayıttan alınmaz; waveform ve geçiş provasını hemen deneyebilirsin.|Create two original rhythm exercises. These 40-second examples do not use commercial recordings. Try waveforms and transitions immediately.
Örnek pratik parçalarını ekle|Add practice example tracks
Sağlayıcı bağlı.|Provider connected.
Bağlantı hazır · sağlayıcı hesabı henüz bağlı değil.|Integration prepared · provider account not connected yet.
Vokal, davul, bass ve enstrüman ayırma için Music AI. İşlem harici sunucuda yapılır; sağlayıcı ücretleri ayrıca geçerlidir.|Music AI separates vocals, drums, bass and instruments. Processing runs on an external server; provider charges apply separately.
Bu ses dosyasının Music AI’a gönderilmesini kabul ediyorum.|I agree to send this audio file to Music AI.
Sonucu kontrol et|Check result
Stem ayırmayı başlat|Start stem separation
Katalog sağlayıcısı adayı. API erişimi ve kullanım hakları doğrulanmadan Transition Lab ses kaynağı olarak etkinleştirilmedi.|Catalog provider candidate. It is not enabled as a Transition Lab source until API access and usage rights are verified.
Özel bulut ses arşivi: 1 GB; dosya başına 25 MB. Ücretli abonelik ve eğitmen hizmetleri henüz açılmadı. Kurucu erişimi harici sağlayıcı ücretlerini veya API hesabını kapsamaz.|Private cloud audio archive: 1 GB, 25 MB per file. Paid subscriptions and instructor services are not open yet. Founder access does not include external provider fees or API accounts.

Ses dinlemeye hazır. Tarayıcı kalıcı kaydı reddettiği için bu dosya yalnızca açık oturumda kullanılabilir. Sayfayı kapatır veya yenilersen ses dosyasını tekrar seçmen gerekir; Library kaydın korunur.|Audio is ready to play. Your browser refused persistent storage, so this file is available only in this session. Select it again after closing or refreshing the page. Your Library record is kept.
Hazır · Yalnızca bu oturumda. Sayfayı yenilersen ses dosyasını tekrar seç.|Ready · This session only. Select the audio again after refreshing.
Bu tarayıcı ses dosyasını kalıcı kaydetmeye izin vermedi.|This browser did not allow persistent audio storage.
Tarayıcının siteye ayırdığı ses alanı dolu. Bu, cihazının boş alanından farklıdır.|This site's browser audio quota is full. This is separate from your device's free space.
Ses arşivi başka bir sekmede açık. Diğer MixNotes sekmesini kapatıp tekrar dene.|Audio storage is open in another tab. Close other MixNotes tabs and try again.
Ses dosyasını yeniden seç. Library kaydın korunuyor.|Select the audio file again. Your Library record is preserved.
Ses dosyası okunamadı.|Could not read the audio file.
Geçiş için ses dosyası|Audio file for transitions
Bu cihazdaki ses dosyasını kaldır|Remove audio from this device
· Gerçek waveform|· Real waveform
Ses dosyasını değiştir|Replace audio file
Ses dosyası eklenemedi.|Could not add the audio file.
Ses dosyası bu cihazda saklanır; sunucuya yüklenmez ve JSON yedeğine dahil değildir. MP3/WAV önerilir · En fazla 50 MB / 15 dakika.|Audio stays on this device. It is not uploaded or included in JSON backups. MP3/WAV recommended · Up to 50 MB / 15 minutes.
Bir seferde en fazla 20 dosya seçebilirsin.|Select up to 20 files at a time.
Ses dosyalarını eklemek için sayfayı yenile.|Refresh the page to add audio files.
Seçilen parça bulunamadı. Yeniden seç.|Track not found. Select it again.
Library kaydı eklenemedi. Yeniden dene.|Could not create the Library record. Try again.
Dosyanın bağlanacağı parça bulunamadı.|Could not find the track for this file.
Hazır · Waveform oluşturuldu|Ready · Waveform created
MP3 / WAV içe aktar|Import MP3 / WAV
MP3 / WAV ekle|Add MP3 / WAV
Ses dosyalarını seç|Choose audio files
iPad’in Dosyalar uygulamasından parçalarını seç. Ses dosyası Library’ye bağlanır, gerçek waveform oluşturulur ve Transition Lab’de kullanılabilir.|Choose tracks from the Files app on your iPad. Audio is attached to your Library, analyzed into a real waveform and available in Transition Lab.
En fazla 20 dosya; dosya başına 50 MB ve 15 dakika. M4A, AAC, OGG ve FLAC desteği tarayıcıya bağlıdır. Ses bu cihazda saklanır; JSON/CSV yedeğine dahil edilmez.|Up to 20 files, 50 MB and 15 minutes each. M4A, AAC, OGG and FLAC support depends on your browser. Audio stays on this device and is excluded from JSON/CSV backups.
Parça adı ve sanatçı dosya adından önerilir; düzenleyebilirsin. Aynı ad ve sanatçıdaki mevcut kayıt kullanılır. Mevcut bir parçaya bağlarsan cihazdaki ses dosyası yenilenir.|Title and artist are suggested from the filename and can be edited. Existing records with the same title and artist are reused. Attaching to an existing track replaces its audio on this device.
Library kaydı|Library record
Yeni parça / aynı kaydı kullan|New track / reuse matching record
Parça adı|Track title
Sanatçı|Artist
İçe aktarım için hazır|Ready to import
Sırayla aktarılıyor…|Importing one at a time…
Ses dosyalarını içe aktar|Import audio files
Listeyi temizle|Clear list
dosya hazır. Başarısız dosyalar tekrar denenebilir.|files ready. Failed files can be retried.
Aday parçalarını topla|Collect your next tracks
Crate bir set değildir; aynı amaç için düşündüğün malzemeyi burada biriktir.|Gather tracks for a shared purpose before arranging a set.
Yeni crate|New crate
CRATE’LERİN|YOUR CRATES
parça|tracks
İlk crate’ini oluştur; örneğin “Warm-up” veya “Sonraki prova”.|Create your first crate, such as “Warm-up” or “Next rehearsal”.
AÇIK CRATE|OPEN CRATE
Bu crate için açıklama eklenmedi.|No description for this crate yet.
Parça ekle|Add tracks
Crate’i düzenle|Edit crate
Tüm parçalar|All tracks
Parça bilgileri değiştikçe içerik otomatik güncellenir.|Contents update automatically when track details change.
Library kuyruğundan bir parçayı buraya sürükleyebilirsin.|Drag a track here from the Library queue.
Crate’ten çıkarıldı|Removed from crate
boş.|is empty.
Kurallara uyan parça yok; kuralları düzenle veya Library’ye yeni parça ekle.|No tracks match. Edit the rules or add tracks to your Library.
Library’den parçaları buraya sürükle veya “Parça ekle”yi kullan.|Drag tracks from the Library or use “Add tracks”.
LIBRARY KUYRUĞU|LIBRARY QUEUE
Sürükle ve ekle|Drag to add
Parça ara|Search tracks
Malzemeni gruplamaya başla|Start organizing your tracks
Afro House Finds, Warm-up veya Try Next Practice gibi bir crate oluştur.|Create a crate such as Afro House Finds, Warm-up or Try Next Practice.
İlk crate’i oluştur|Create your first crate
Afro / Melodic House · satın alma ve katalog|Afro / Melodic House · purchase and catalog
Bağımsız sanatçılar · satın alma|Independent artists · purchase
Keşif, remix ve edit bağlantıları|Discovery, remix and edit links
DJ pool · kendi üyeliğinle erişim|DJ pool · access with your membership
Katalog araması başarısız.|Catalog search failed.
Keşif kuyruğuna kaydedildi|Saved to discovery queue
Bir sonraki sesini bul.|Find your next sound.
Katalogda ara, kaynaklarını aç, aday parçaları hazırlık kuyruğuna al.|Search the catalog, explore sources and save candidates to your preparation queue.
Bağlantı / fikir kaydet|Save link / idea
Katalog araması|Catalog search
iTunes kataloğundaki parça bilgileri. BPM ve key bilgilerini daha sonra ekleyebilirsin.|Track details from the iTunes catalog. Add BPM and key later.
Katalogda sanatçı veya parça ara|Search the catalog by artist or track
Sanatçı veya parça adı…|Artist or track title…
Aranıyor…|Searching…
Ara|Search
Arama sonuçları|Search results
Sonuç yok. Sanatçı veya parça adıyla yeniden ara.|No results. Try another artist or track title.
iTunes’ta aç|Open in iTunes
Kayıtlı|Saved
Kaynak masası|Music sources
/ DIŞ KAYNAK|/ EXTERNAL SOURCE
Kaynağı aç|Open source
Bu bağlantılar kaynağı ayrı sekmede açar. Pool üyeliklerin MixNotes’a bağlanmış değildir.|These links open sources in another tab. Your pool memberships are not connected to MixNotes.
Dinle, değerlendir, Library’ye al|Listen, review, add to Library
Sanatçı ekle|Add artist
Library’ye alındı|Added to Library
Library’ye al|Add to Library
Henüz aday parça yok. Aramadan bir parçayı kaydet veya kendi bağlantını ekle.|No candidates yet. Save a search result or add your own link.
Vazgeç|Cancel
Kaydet|Save
Kaydediliyor…|Saving…
Kaydediliyor|Saving
Bilgiler getiriliyor|Loading details
Parça güncellendi|Track updated
Parça kaydedildi|Track saved
Discovery — henüz aday|Discovery — candidate
Library — çalabilirim|Library — ready to play
Tür|Genre
Alt tür|Subgenre
Belirtilmedi|Not specified
Puan yok|No rating
Virgülle ayır|Separate with commas
Kaynak adı|Source name
Bağlantıdan otomatik algılanır|Detected from the link
Cue notları|Cue notes
Bu parçayı nerede ve nasıl kullanmak istiyorsun?|Where and how do you want to use this track?
Daha fazla metadata ve hazırlık notu|More metadata and preparation notes
Süre (saniye)|Duration (seconds)
Minimum BPM maksimumdan büyük olamaz.|Minimum BPM cannot exceed maximum BPM.
Crate güncellendi|Crate updated
Crate oluşturuldu|Crate created
Crate adı|Crate name
Açıklama|Description
Kurallara uyan parçalar otomatik eklenir. Tüm kurallar birlikte uygulanır.|Matching tracks are added automatically. All rules apply together.
Tür içerir|Genre contains
Etiket eşleşir|Tag matches
Her enerji|Any energy
Her puan|Any rating
Parça durumu|Track status
Set güncellendi|Set updated
Set oluşturuldu|Set created
Set adı|Set name
Tür / yön|Genre / direction
Taslak|Draft
Hazır|Ready
Çalındı|Performed
Ortam, enerji yönü ve hatırlamak istediklerin…|Venue, energy direction and things to remember…
Geçiş güncellendi|Transition updated
Geçiş hafızaya eklendi|Transition saved
Parça seç|Select a track
Geçiş tipi|Transition type
Fikir|Idea
Çalışılıyor|Practicing
Mix-out noktası|Mix-out point
Mix-in noktası|Mix-in point
EQ tekniği|EQ technique
Kişisel not|Personal notes
Neyin işe yaradığını veya neyi tekrar denemen gerektiğini yaz.|Write what worked or what you want to try again.
Sanatçı yok|No artist
Ekle|Add
Eklenebilecek eşleşen parça kalmadı.|No matching tracks left to add.
Tamam|Done
Parçayı düzenle|Edit track
Library’ye parça ekle|Add track to Library
Keşif kaydet|Save discovery
DJ açısından işine yarayacak bilgiyi şimdi ekle; ayrıntıları sonra tamamlayabilirsin.|Add the details you need as a DJ now. Fill in the rest later.
Aynı amaç için düşündüğün aday parçaları bir araya getir.|Collect candidate tracks for a shared purpose.
Seti düzenle|Edit set
Çalmayı planladığın bilinçli performans akışı için bir çalışma alanı aç.|Create a workspace for the performance flow you want to play.
Geçişi düzenle|Edit transition
Geçiş hafızası oluştur|Create transition memory
Track A’dan Track B’ye kendi yaklaşımını kaydet.|Save your approach from Track A to Track B.
Library’den parça ekle|Add tracks from Library
Arayıp seç; aynı parça ikinci kez eklenmez.|Search and select. Each track can only be added once.
Parça, crate ve set bağlantılarıyla ona bağlı geçişler kaldırılacak.|The track, its crate and set links, and related transitions will be removed.
Crate kaldırılacak; içindeki parçalar Library’de kalacak.|The crate will be removed. Its tracks stay in the Library.
Set sırası kaldırılacak; parçalar ve Transition Memory kayıtları kalacak.|The set order will be removed. Tracks and Transition Memory records will stay.
Bu geçişe ait kişisel hazırlık notu kaldırılacak.|Preparation notes for this transition will be removed.
Kayıt silindi|Record deleted
” silinsin mi?|” — delete this record?
Sil|Delete
HAZIRLIK MASASI|PREPARATION DESK
Sıradaki set burada başlar.|Your next set starts here.
Keşfettiğin parçadan prova edeceğin geçişe kadar kaldığın yerden devam et.|Pick up where you left off, from discovering tracks to rehearsing transitions.
Fikir kaydet|Save an idea
MixNotes hazırlık akışı|MixNotes preparation flow
KEŞFET|DISCOVER
ORGANİZE ET|ORGANIZE
SETİ HAZIRLA|BUILD YOUR SET
GEÇİŞİ ÇALIŞ|REHEARSE TRANSITIONS
DEVAM ET|CONTINUE
İlk setini hazırla|Prepare your first set
akış|flows
hazırlanmış geçiş|prepared transitions
Set Builder’ı aç|Open Set Builder
Bir set oluştur; Library’den parçaları sırala ve aralarındaki geçişleri kaydet.|Create a set, arrange Library tracks and save the transitions between them.
Set oluştur|Create a set
Sıradaki çalışma|Next rehearsal
İlk parça|First track
İkinci parça|Second track
ÇALIŞILIYOR|PRACTICING
FİKİR|IDEA
HAZIR|READY
İki parçayı bağladığında MixNotes burada neyi çalışacağını hatırlatacak.|Link two tracks and MixNotes will remind you what to rehearse here.
İlk geçişi kaydet|Save your first transition
Keşiften sahneye.|From discovery to the dancefloor.
Parçalarını bul, akışını kur, prova et. Her karar bir sonraki setine kalsın.|Find your tracks, build your flow, rehearse. Keep every decision for your next set.
Discover’ı aç|Open Discover
Prova kaydet|Log a rehearsal
PARÇA|TRACK
PROVA / SAHNE DK|REHEARSAL / STAGE MIN
SON EKLENENLER|RECENTLY ADDED
Hazırlık kuyruğun|Your preparation queue
Tüm Library|Full Library
Hazırlık kuyruğun boş.|Your preparation queue is empty.
Bir bağlantı veya parça fikri kaydet; daha sonra düzenleyebilirsin.|Save a link or track idea. You can edit it later.
İlk parçayı kaydet|Save your first track
Parçaların ve keşiflerin|Your tracks and discoveries
DJ açısından önemli bilgiyi hızlı tara; ayrıntıyı seçtiğinde aç.|Scan the details that matter to you as a DJ. Select a track to explore more.
Library’ye ekle|Add to Library
Parçalarda ara|Search tracks
Parça, sanatçı, tür veya etiket ara|Search title, artist, genre or tag
Aramayı temizle|Clear search
Filtreler|Filters
Durum|Status
Tümü|All
Keşif|Discovery
Tüm türler|All genres
Temizle|Clear
Satıra tıkla → ayrıntıları aç|Select a row → open details
DURUM|STATUS
TEMPO|TEMPO
ENERJİ|ENERGY
TÜR|GENRE
KAYNAK|SOURCE
Eşleşen parça yok.|No matching tracks.
Aramayı veya filtreleri temizleyip tekrar dene.|Clear your search or filters and try again.
Filtreleri temizle|Clear filters
Seçili parça ayrıntıları|Selected track details
SEÇİLİ PARÇA|SELECTED TRACK
Sanatçı eklenmedi|No artist added
NOT|NOTES
Bu parça için henüz DJ notu yok.|No DJ notes for this track yet.
Düzenle|Edit
Library’ye taşındı|Moved to Library
Library parçası yap|Move to Library
HIZLI EKLE|QUICK ADD
Kaynakta aç|Open source
Ayrıntıları görmek için bir parça seç.|Select a track to see its details.
Seans geçmişe kaydedildi|Session saved to history
Geçişini duy, geliştir.|Hear your transition. Make it yours.
Ne çaldığını, hangi geçişi çalıştığını ve sonraki denemede neyi değiştireceğini hatırla.|Remember what you played, which transitions you practiced and what to change next time.
İki parçayla başla|Start with two tracks
Import / Export bölümünden en az iki ses dosyası ekle. Burada waveform’ları görüp geçişini dinleyebilirsin.|Import at least two audio files in Import / Export. View their waveforms and hear your transition here.
TOPLAM SÜRE|TOTAL TIME
PROVA|REHEARSAL
PERFORMANS|PERFORMANCE
ORTALAMA PUAN|AVERAGE RATING
YENİ KAYIT|NEW SESSION
Seansını kaydet|Log your session
Prova|Rehearsal
Performans|Performance
Tarih|Date
Süre (dakika)|Duration (minutes)
Nasıl geçti?|How did it go?
Set (isteğe bağlı)|Set (optional)
Serbest seans|Free session
Çalıştığın geçiş (isteğe bağlı)|Transition practiced (optional)
Geçiş seç|Select a transition
Öğrendiklerin / sonraki deneme|Lessons / next attempt
Bass değişimini 16 bar geciktir. Vokal çakışmasını azalt…|Delay the bass swap by 16 bars. Reduce vocal overlap…
Seansı kaydet|Save session
Geçmiş|History
Geçmiş filtresi|History filter
İlk seansını kaydettiğinde gelişim geçmişin burada başlayacak.|Your progress history starts with your first session.
dk ·|min ·
Silmeyi onayla|Confirm deletion
Seansı sil|Delete session
Avatarın güncellendi|Avatar updated
Hesabım · avatar değiştir|My account · change avatar
Ritmini seç.|Pick your rhythm.
MixNotes’ta seni hangi avatar temsil etsin?|Which avatar represents you in MixNotes?
Avatar seçimi|Choose an avatar
Daha sonra|Later
Avatarı kaydet|Save avatar
Kulaklıklı DJ|Headphone DJ
Gece kedisi|Night cat
Beat robotu|Beat robot
Kozmik dinleyici|Cosmic listener
Plak koleksiyoncusu|Vinyl collector
BPM AKIŞI|BPM FLOW
Set sırası güncellendi|Set order updated
Akışı sırala, boşlukları gör|Arrange your flow. Spot the gaps.
BPM ve enerji bilgisini rehber olarak kullan; yaratıcı karar her zaman sende.|Use BPM and energy as guides. The creative decisions are yours.
Yeni set|New set
SETLERİN|YOUR SETS
parça ·|tracks ·
Bir set oluşturup Library’den performans sırasını kur.|Create a set and arrange your performance from Library tracks.
AÇIK SET|OPEN SET
Tür belirtilmedi|No genre specified
Set notlarını indir|Download set notes
SÜRE|DURATION
GEÇİŞ|TRANSITION
SET NOTU|SET NOTES
Setten çıkarıldı|Removed from set
Geçiş hazır|Transition ready
Geçişi hazırla|Prepare transition
Set sırası boş.|Your set is empty.
Library kuyruğundan parçaları sürükle veya “Parça ekle”yi kullan.|Drag tracks from the Library queue or use “Add tracks”.
sonrasında|after
Library önerileri|Library suggestions
Kayıtlı geçişler, BPM, Camelot key ve enerji bilgilerine göre sıralanır. Dinleyerek kontrol et.|Ranked by saved transitions, BPM, Camelot key and energy. Check by listening.
Öneri sete eklendi|Suggestion added to set
Sete ekle|Add to set
Öneri için Library’ye çalınabilir parçalar ve BPM / key / enerji bilgisi ekle.|Add playable Library tracks with BPM, key and energy to get suggestions.
Sete sürükle|Drag into set
İlk performans akışını kur|Build your first performance flow
Set bir crate değildir; çalacağın parçaları bilinçli bir sıraya yerleştir.|A set is an intentional playing order. Arrange the tracks you want to perform.
İlk seti oluştur|Create your first set
Sanatçı bilgisi kaynakta yok|Artist unavailable from source
’ta aç|— open source
Parça bilgileri alınamadı.|Could not load track details.
Bağlantıdan parça ekle|Add a track from a link
Parça bağlantısını yapıştır|Paste a track link
Bağlantıdan erişilebilen bilgiler otomatik doldurulur. Dilersen elle düzenleyebilirsin.|Available link details are filled in automatically. You can edit them manually.
Bağlantıdan bilgileri getir|Load link details
Parça bilgileri getiriliyor…|Loading track details…
Tekrar dene|Try again
veya aşağıdaki alanları elle doldur.|or fill in the fields below manually.
BPM ve Key kaynakta yoksa boş kalır. YouTube kanal adı, sanatçı adı olarak doldurulmaz.|BPM and key stay blank when unavailable. YouTube channel names are not used as artist names.
Satın alma|Purchase
KAYNAKLAR /|SOURCES /
Erişim durumu|Availability
Referans|Reference
Elimde var|Owned
Kaynağı kaydet|Save source
Tür yok|No genre
Diğer işlemler|More actions
Dosya 4 MB sınırını aşıyor.|File exceeds the 4 MB limit.
Bu geçerli bir MixNotes yedeği değil:|Not a valid MixNotes backup:
İçe aktarım tamamlandı|Import complete
Arşivin seninle hareket etsin.|Take your collection with you.
Ses dosyalarını ekle, parça bilgilerini taşı ve çalışma alanını yedekle.|Add audio files, transfer track details and back up your workspace.
İçe aktar|Import
Rekordbox metin dışa aktarımı veya başlıkları eşleşen CSV/TSV dosyası; en fazla 200 parça. MixNotes JSON yedeği de kabul edilir.|Import a Rekordbox text export or CSV/TSV with matching headers, up to 200 tracks. MixNotes JSON backups are also supported.
Dosya seç|Choose file
Örnek CSV indir|Download sample CSV
MP3/WAV için yukarıdaki ses içe aktarma alanını kullan. DJ yazılımlarının cue/beatgrid verileri aktarılmaz.|Use the audio import area above for MP3/WAV. Cue and beatgrid data from DJ software are not imported.
Dışa aktar|Export
JSON: parçalar, kaynaklar, crates, setler, geçişler ve seans geçmişi. CSV: parça metadata’sı. Ses dosyaları yedeklere dahil edilmez.|JSON: tracks, sources, crates, sets, transitions and session history. CSV: track metadata. Audio files are excluded from backups.
Tam yedek indir|Download full backup
ÖNİZLEME /|PREVIEW /
Aynı ad, sanatçı ve versiyonla kayıtlı parçalar atlanır. Mevcut bilgiler değiştirilmez.|Tracks with the same title, artist and version are skipped. Existing details stay unchanged.
Yedek yeni kayıtlar olarak eklenir; mevcut kayıtların üzerine yazılmaz. Aynı yedek tekrar eklenmez.|Backups are added as new records without overwriting existing data. The same backup cannot be imported twice.
Aktarılıyor…|Importing…
İçe aktarımı tamamla|Complete import
Yumuşak blend|Smooth blend
Geçiş ayarlarını kontrol et.|Check your transition settings.
Ses başlatılamadı. MP3/WAV dosyalarını kontrol et.|Could not start audio. Check your MP3/WAV files.
Geçiş ortasında düşük frekansları A’dan B’ye devret|Swap low frequencies from A to B at the midpoint
B temposu A’ya eşlendi|B tempo matched to A
Geçiş ayarları hafızaya kaydedildi|Transition settings saved
Geçiş dinleme stüdyosu|Transition listening studio
Geçişini gör. Ayarla. Dinle.|See your transition. Shape it. Hear it.
A’dan B’ye gerçek sesle prova yap.|Rehearse from A to B with real audio.
Apple Music / Spotify oynatıcıları ses analizine açık değildir. Gerçek waveform ve miks için aşağıdaki parçalara kendi ses dosyalarını ekle.|Apple Music / Spotify players do not expose audio for analysis. Add your own audio files to the tracks below for real waveforms and mixing.
Çıkış parçası|Outgoing track
Giriş parçası|Incoming track
Ses dosyası eklendiğinde gerçek waveform burada görünür.|Add an audio file to see its real waveform here.
Mix-out başlangıcı|Mix-out start
Mix-in başlangıcı|Mix-in start
Geçiş ayarları|Transition settings
Geçiş biçimi|Transition style
Örtüşme süresi|Overlap duration
Waveform yakınlığı|Waveform zoom
B temposunu A’ya eşle|Match B tempo to A
BPM aralığına yuvarla|Snap to BPM interval
BPM’den süre|Duration from BPM
Tempo eşleme B’nin çalma hızını ve tonunu değiştirir. BPM aralığına yuvarlama gerçek beatgrid / downbeat tespiti değildir; cue noktalarını dinleyerek hizala. Prova, geçişin 4 saniye öncesini ve sonrasını da çalar.|Tempo matching changes B’s speed and pitch. BPM snapping does not detect a beatgrid or downbeat; align cues by ear. Rehearsal includes 4 seconds before and after the transition.
İki farklı parça seç.|Select two different tracks.
Ses hazırlanıyor…|Preparing audio…
Geçişi dinle|Listen to transition
Geçişi kaydet|Save transition
İki ses dosyası hazır|Both audio files are ready
Dinlemek için iki parçaya da ses dosyası ekle|Attach audio to both tracks to listen
İyi geçişleri unutma|Keep your best transitions
İki parça arasındaki kişisel tekniğini kaydet; tekrar karşılaştığında bilgi hazır olsun.|Save your technique between two tracks so it is ready next time.
Geçiş kaydet|Save transition
Geçişlerde ara|Search transitions
Parça veya geçiş notu ara|Search tracks or transition notes
Geçiş durumu filtresi|Transition status filter
Geçişi sil|Delete transition
Bağlanmamış parça|Unlinked track
ZAMAN|TIME
Stüdyoda dinle|Listen in studio
Zorluk|Difficulty
Puan|Rating
Son prova|Last rehearsal
Önce iki parça ekle|Add two tracks first
Geçiş hafızan burada büyüyecek|Your transition memory grows here
Bir geçiş ilişkisi kurmak için Library’de en az iki parça olmalı.|Add at least two Library tracks to create a transition.
İki parçayı bağla; mix-in, mix-out, EQ ve prova notlarını sakla.|Link two tracks and save mix-in, mix-out, EQ and rehearsal notes.
Çalışma alanı yüklenemedi.|Could not load workspace.
Çevrimdışı kopya açıldı. Bağlantı gelene kadar görüntüleyebilirsin.|Offline copy opened. You can view it until connection returns.
Değişiklik yapmak için yeniden bağlan.|Reconnect to make changes.
Değişiklik kaydedilemedi.|Could not save changes.
MixNotes yedeği indirildi|MixNotes backup downloaded
Yeni kayıt|New record
Yeni set oluştur|Create a new set
Geçiş notu|Transition notes
Hazırlık alanın kuruluyor…|Preparing your workspace…
Çalışma alanına ulaşamadık|We could not reach your workspace
Beklenmeyen bir hata oluştu.|An unexpected error occurred.
Menüyü aç|Open menu
MixNotes ana çalışma alanı|MixNotes home workspace
Her yerde ara|Search everywhere
Verilerini JSON olarak dışa aktar|Export your data as JSON
Yedekle|Back up
Çevrimdışı kopyayı görüntülüyorsun. Değişiklikler bağlantı geri geldiğinde yapılabilir.|You are viewing an offline copy. Changes can be made when connection returns.
Yeniden dene|Try again
MENÜ|MENU
Menüyü kapat|Close menu
Çalışılacak geçiş var|Transitions to practice
HIZLI CRATES|QUICK CRATES
Crate oluştur|Create crate
Hazırlık malzemeni crate’lerde grupla.|Group your preparation tracks into crates.
Verilerin senin hesabına bağlı|Your data belongs to your account
MixNotes’ta ara|Search MixNotes
Parçalar, crate’ler, setler, geçişler ve hızlı işlemler.|Tracks, crates, sets, transitions and quick actions.
Bir şey yaz…|Type something…
Aramana uyan bir kayıt bulunamadı.|No records match your search.
Ana|Home
 sn| sec
dk|min
Geçişler|Transitions
Dil|Language
Dil tercihin kaydedildi|Language preference saved
Notlar|Notes
Etiketler|Tags
Enerji|Energy
Versiyon / Remix|Version / Remix
Intro notları|Intro notes
Outro notları|Outro notes
Label|Label
FX notları|FX notes
Zamanlama notları|Timing notes
Son prova tarihi|Last rehearsal date
Durdur|Stop
Orijinal tempo|Original tempo
Kaydedildi|Saved
Ses analiz ediliyor…|Analyzing audio…
Library’ye ekleniyor…|Adding to Library…
Dosya kaydediliyor…|Saving file…
Dosya eklenemedi.|Could not add file.

Library’de ara|Search Library
Geçiş notun var|Transition notes saved
Camelot uyumu|Camelot compatible
Aynı tür|Same genre
aday|candidates
sn|sec
dk|min
seans|sessions
BPM ve Key|BPM and Key
A: 00:32 giriş · B: 01:36 drop|A: 00:32 intro · B: 01:36 drop
Apple Music, Spotify, YouTube, SoundCloud veya Beatport|Apple Music, Spotify, YouTube, SoundCloud or Beatport
Ses dosyası eklemek için çalışma alanını yenile.|Refresh your workspace to add audio.
En fazla 50 MB ses dosyası ekleyebilirsin.|Audio files can be up to 50 MB.
MP3, WAV, M4A, AAC, OGG veya FLAC dosyası seç.|Choose an MP3, WAV, M4A, AAC, OGG or FLAC file.
Tek parça en fazla 15 dakika olabilir.|Each track can be up to 15 minutes.
Ses dosyası çözülemedi. MP3 veya WAV sürümünü dene.|Audio could not be decoded. Try an MP3 or WAV version.
Bu tarayıcıda ses dosyası saklanamıyor.|This browser cannot store audio files.
Ses dosyası kaydedilemedi. Cihazın depolama alanını kontrol et.|Could not save audio. Check your device storage.
Geçiş değerlerini kontrol et.|Check the transition values.
Geçiş noktalarını ve süreyi kontrol et.|Check the transition cues and duration.
Tempo eşleme için iki parçanın da BPM bilgisini gir.|Enter BPM for both tracks to match tempo.
Tempo farkı çok büyük. Tempo eşlemeyi kapat veya daha yakın BPM’li parçalar seç.|The tempo gap is too large. Disable tempo matching or select tracks with closer BPM.
Geçiş parça sonunu aşıyor. Cue noktasını geri al veya süreyi kısalt.|The transition runs past the track end. Move the cue back or shorten the duration.
Geçerli bir parça bağlantısı yapıştır.|Paste a valid track link.
HTTPS parça bağlantısı kullan.|Use an HTTPS track link.
Albüm yerine tek bir şarkının paylaşım bağlantısını kullan.|Use a single song’s share link instead of an album link.
Apple Music, Spotify, YouTube, SoundCloud veya Beatport parça bağlantısı kullan. Kısaltılmış bağlantı yerine tam parça linkini paylaş.|Use a full Apple Music, Spotify, YouTube, SoundCloud or Beatport track link instead of a shortened link.
Playlist veya albüm yerine tek bir parça bağlantısı kullan.|Use a single track link instead of a playlist or album.
Müzik servisine şu anda ulaşılamıyor. Tekrar dene veya bilgileri elle ekle.|The music service is currently unreachable. Try again or enter details manually.
Kaynak bağlantıyı başka bir adrese yönlendiriyor. Serviste şarkıyı açıp tam parça bağlantısını yeniden paylaş.|The source redirects to another address. Open the song in the service and share its full track link again.
Kaynak şu anda parça bilgilerini paylaşmıyor. Tekrar dene veya bilgileri elle ekle.|The source is not sharing track details right now. Try again or enter them manually.
Kaynak yanıtı çok büyük.|Source response is too large.
Kaynak boş yanıt verdi.|The source returned an empty response.
Kaynak geçerli parça bilgisi döndürmedi. Tekrar dene veya bilgileri elle ekle.|The source returned invalid track details. Try again or enter them manually.
Apple Music parça bilgilerine ulaşılamadı. Tekrar dene veya bilgileri elle ekle.|Apple Music track details are unavailable. Try again or enter them manually.
Bu şarkı ilgili ülkenin kataloğunda bulunamadı. Başka bir ülkeye ait parça linkini deneyebilir veya elle ekleyebilirsin.|This song was not found in that country’s catalog. Try a link from another country or add it manually.
Kaynak parça adını döndürmedi. Bilgileri elle ekleyebilirsin.|The source did not return a track title. Enter the details manually.
Provası hazır geçiş|Rehearsed transition
Kayıtlı geçiş|Saved transition
Yakın BPM|Similar BPM
Uyumlu key|Compatible key
Yakın enerji|Similar energy
Aynı key|Same key
Harmonik uyum|Harmonic match
Enerji yükseltme|Energy boost
Key çatışması|Key clash
Key bilinmiyor|Key unknown
ENERJİ|ENERGY
BPM verisi ekle|Add BPM data
Sahne modu|Stage mode
Akışı optimize et|Optimize flow
SAHNE MODU|STAGE MODE
NOT|NOTE
Geçiş notu yok|No transition note
SIRADAKİ|UP NEXT
Son parça. Kapanışı güzel yap.|Last track. Close it out beautifully.
Önceki|Previous
Sonraki|Next
Performansı kaydet?|Log this performance?
Nasıl geçti? Puan verirsen Transition Lab geçmişine eklenir ve set çalındı olarak işaretlenir.|How did it go? Rating it adds it to your Transition Lab history and marks the set as performed.
Sahneye dön|Back to stage
Kaydetmeden çık|Exit without saving
Performans kaydedildi|Performance logged
İlk parçan sabit kalır. Sıralama kayıtlı geçişlerine, BPM farkına, Camelot uyumuna ve enerji akışına göre puanlanır. Son karar senin.|Your opener stays put. Order is scored on saved transitions, BPM distance, Camelot compatibility and energy flow. The final call is yours.
ŞİMDİ|NOW
ÖNERİ|SUGGESTED
Mevcut sıra zaten en akıcı seçenek görünüyor.|The current order already looks like the smoothest option.
Vazgeç|Cancel
Bu sırayı uygula|Apply this order
Set akışı optimize edildi|Set flow optimized
Ritme dokun; son vuruşların ortalaması BPM'i verir. 2 saniye beklersen yeniden başlar.|Tap along to the beat; your recent taps are averaged into BPM. Pause for 2 seconds to start over.
DOKUN|TAP
Sıfırla|Reset
BU TEMPODA LIBRARY|LIBRARY AT THIS TEMPO
Camelot çarkı|Camelot wheel
Bir key seç; uyumlu key'ler ve Library'deki karşılıkları öne çıkar. Halka ne kadar doluysa o key'de o kadar parçan var.|Pick a key to highlight compatible keys and matching Library tracks. The fuller a segment, the more tracks you have in that key.
UYUMLU KEY'LER|COMPATIBLE KEYS
LIBRARY'DE|IN LIBRARY
Bu key'lerde parça yok. Library'de key bilgisini Camelot formatında (ör. 8A) gir.|No tracks in these keys. Enter keys in Camelot format (e.g. 8A) in your Library.
Yüksek güven|High confidence
Orta güven|Medium confidence
Düşük güven|Low confidence
Analiz ediliyor…|Analyzing…
Yeniden analiz et|Analyze again
BPM ve key'i analiz et|Analyze BPM and key
Parçaya uygula|Apply to track
Kayıttaki değerlerle aynı.|Matches the saved values.
Belirgin bir ritim veya ton bulunamadı.|No clear beat or key was found.
Analiz bu cihazda yapılır ve tahmindir. Yarım/çift tempo karışabilir; kulağınla doğrula.|Analysis runs on this device and is an estimate. Half/double tempo can be confused; confirm by ear.
Analiz sonucu parçaya kaydedildi|Analysis saved to track
Ses dosyası analiz edilemedi. MP3 veya WAV sürümünü dene.|The audio file could not be analyzed. Try an MP3 or WAV version.
Analiz başarısız.|Analysis failed.
Şablondan set|From template
Şablondan başla|Start from a template
Şablondan set oluştur|Create a set from a template
Bir enerji eğrisi seç; MixNotes Library'nden bu eğriye ve akıcı geçişlere uyan parçaları sıralar. Sonra istediğin gibi düzenle.|Pick an energy curve; MixNotes orders Library tracks that fit it with smooth transitions. Then edit as you like.
Isınma|Warm-up
Düşük enerjiyle başla, odayı yavaşça doldur.|Start low and fill the room gradually.
Zirve saati|Peak time
Yüksek enerjiyi koru, kısa nefes aralarıyla.|Hold high energy with short breathers.
Gün batımı|Sunset
Melodik bir yükseliş, sonra yumuşak bir iniş.|A melodic rise, then a gentle descent.
Yolculuk|Journey
Uzun set: yavaş başla, zirveye çık, kontrollü kapat.|Long set: start slow, climb to the peak, land with control.
Kapanış|Closing
Zirveden çık, tanıdık parçalarla nazikçe bitir.|Come down from the peak and finish gently with familiar tracks.
Set adı|Set name
Süre (dk)|Length (min)
Tür|Genre
Tüm Library|Whole Library
Hedef|Target
Seçilen|Selected
Bu seçime uyan Library parçası yok. Türü değiştir veya Library'ye parça ekle.|No Library tracks match this selection. Change the genre or add tracks.
Seti oluştur|Create set
Şablondan set oluşturuldu|Set created from template
Dışa aktar|Export
Seti dışa aktar|Export set
Seti DJ yazılımına playlist olarak al. Parçalar dosya adıyla eşlenir; ses dosyası MixNotes'a ekliyse onun adı kullanılır, değilse “Sanatçı - Parça.mp3” varsayılır.|Bring the set into your DJ software as a playlist. Tracks are matched by file name: an audio file attached in MixNotes keeps its name, otherwise “Artist - Title.mp3” is assumed.
Müzik klasörün (isteğe bağlı)|Your music folder (optional)
Dosyalarının bulunduğu klasörü yazarsan yazılım parçaları doğrudan bulur. Boş bırakırsan playlist'i müzik klasörüne koyup açabilirsin.|If you enter the folder that holds your files, the software finds tracks directly. Leave it blank and open the playlist from inside your music folder.
Rekordbox › Tercihler › Gelişmiş › rekordbox xml ile içe al. BPM, key, puan ve geçiş notları yorum olarak gelir.|Import via Rekordbox › Preferences › Advanced › rekordbox xml. BPM, key, rating and transition notes arrive as comments.
Serato, Traktor, VirtualDJ ve Engine DJ'de playlist olarak açılır.|Opens as a playlist in Serato, Traktor, VirtualDJ and Engine DJ.
Set notları (TXT)|Set notes (TXT)
Sıra, BPM/key, cue notları ve geçiş teknikleri; yazdırmak için.|Order, BPM/key, cue notes and transition techniques, ready to print.
Cue noktaları ve beatgrid DJ yazılımının kendi analizine bırakılır.|Cue points and beatgrids are left to your DJ software's own analysis.
Seti paylaş|Share set
Bağlantıya sahip olan herkes set listesini görür: parça adı, sanatçı, BPM, key ve süre. DJ notların, cue'ların, puanların ve kaynakların gizli kalır.|Anyone with the link sees the tracklist: title, artist, BPM, key and length. Your DJ notes, cues, ratings and sources stay private.
Kopyala|Copy
Paylaş|Share
Paylaşılıyor|Shared
Sayfayı aç|Open page
Bağlantıyı kaldır|Remove link
Evet, bağlantıyı kaldır|Yes, remove the link
Kaldırırsan eski bağlantı çalışmaz. Yeniden paylaşırsan yeni bir bağlantı oluşur.|Once removed, the old link stops working. Sharing again creates a new link.
Bağlantı oluştur|Create link
Bağlantı kopyalandı|Link copied
Kopyalanamadı; bağlantıyı seçip kopyala.|Could not copy; select the link and copy it.
Paylaşım bağlantısı oluşturuldu|Share link created
Paylaşım bağlantısı kaldırıldı|Share link removed
İSTATİSTİKLER|STATS
Hazırlık nabzın|Your prep pulse
PROVA SERİSİ|PRACTICE STREAK
gün|days
SON 30 GÜN|LAST 30 DAYS
PERFORMANS|PERFORMANCES
HAZIR GEÇİŞ|READY TRANSITIONS
Son 12 hafta|Last 12 weeks
Pzt|Mon
Çar|Wed
Cum|Fri
Az|Less
Çok|More
Bir güne dokun; o günkü prova süresini gör.|Tap a day to see its practice time.
Library BPM dağılımı|Library BPM spread
Bir sütuna dokun; o tempo aralığındaki parça sayısını gör.|Tap a column to see how many tracks sit in that tempo range.
BPM bilgisi olan Library parçası yok.|No Library tracks with BPM yet.
En çok kullandığın key'ler|Your most used keys
Key'leri Camelot formatında (ör. 8A) gir ya da ses dosyasından analiz et.|Enter keys in Camelot format (e.g. 8A) or analyze them from audio.
Camelot çarkında gör|See on the Camelot wheel
En çok çaldığın parçalar|Your most played tracks
Sahne modundan performans kaydettiğinde en çok çaldığın parçalar burada görünür.|Log performances from stage mode and your most played tracks appear here.
MixNotes'u ana ekrana ekle|Add MixNotes to your home screen
Safari'de Paylaş|In Safari, tap Share
› Ana Ekrana Ekle'ye dokun. Tam ekran açılır, internet yokken de son kopyan görünür.|› Add to Home Screen. It opens full screen and shows your last copy even without internet.
Tam ekran açılır, kabinde internet yokken de son kopyan görünür.|Opens full screen and shows your last copy even with no internet in the booth.
Yükle|Install
Kapat|Close
Sahne modunu aç|Open stage mode
Seti dışa aktar|Export set
İstatistikler|Stats
Sırayla özel bir Spotify playlist'i oluşturur. Spotify bağlantısı olan parçalar doğrudan, diğerleri aramayla eşlenir.|Creates a private Spotify playlist in set order. Tracks with a Spotify link are used directly; others are matched by search.
Önce Discover'da Spotify hesabını bağla.|Connect your Spotify account in Discover first.
Playlist hazır:|Playlist ready:
parça eklendi.|tracks added.
Spotify'da aç|Open in Spotify
parça bulunamadı|tracks not found
Spotify playlist oluşturulamadı. Tekrar dene.|Could not create the Spotify playlist. Try again.
Spotify playlist oluşturma izni vermedi. Hesabını yeniden bağla; bağlanırken playlist izni istenecek.|Spotify did not allow playlist creation. Reconnect your account; playlist permission will be requested.
Setteki parçaların hiçbiri Spotify’da bulunamadı.|None of the set's tracks were found on Spotify.
Sette parça yok.|The set has no tracks.
Set bulunamadı.|Set not found.
İşleniyor… Sonuç otomatik kontrol ediliyor.|Processing… checking for the result automatically.
Stem'lerin ekleneceği parça|Track to attach the stems to
Stem'leri Stem Mixer'a ekle|Add stems to Stem Mixer
Stem dosyası sağlayıcıdan alınamadı. Bağlantının süresi dolmuş olabilir.|Could not fetch the stem from the provider. The link may have expired.
Çıktılarda vokal/davul/bass/diğer stem’i bulunamadı.|No vocal/drum/bass/other stems were found in the outputs.
Pro aktif|Pro active
Yıllık|Yearly
Aylık|Monthly
yenileme|renews
Aboneliği yönet|Manage subscription
Aylık Pro'ya geç|Go Pro monthly
Yıllık Pro'ya geç|Go Pro yearly
Ödeme Stripe'ın güvenli sayfasında alınır; kart bilgilerin MixNotes'a gelmez. İstediğin zaman iptal edebilirsin.|Payment happens on Stripe's secure page; your card details never reach MixNotes. Cancel any time.
Dahil|Included
Pro hesabın aktif · Tüm araçlar ve sınırsız hazırlık kaydı açık.|Your Pro account is active · All tools and unlimited prep records are unlocked.
Free hesabın aktif. Pro’ya istediğin zaman geçebilirsin.|Your Free account is active. Upgrade to Pro any time.
Ödeme isteği tamamlanamadı.|The payment request could not be completed.
Ödemeler henüz açılmadı.|Payments are not open yet.
Pro aboneliğin zaten aktif. Yönetmek için “Aboneliği yönet”i kullan.|Your Pro subscription is already active. Use “Manage subscription” to change it.
Yönetilecek bir abonelik bulunamadı.|No subscription to manage was found.
BPM / key ses dosyasından dolduruldu|BPM / key filled from the audio file
Bölümler|Sections
Ritim & Key|Rhythm & key
Set araçları|Set tools
Pratik|Practice
Donanım & Servisler|Gear & services
Stüdyo|Studio
Karşılaştır|Compare
Kontrolcü|Controller
Seanslar|Sessions
Akış|Flow
Hazırlık|Readiness
Öneriler|Suggestions
Genel|Overview
Geceye imzanı bırak.|Leave your mark on the night.
Keşiften sahneye, her geçiş senin imzan. Parçanı bul, akışını kur, geçişini prova et.|From discovery to the stage, every transition is your signature. Find the track, build the flow, rehearse the blend.
Kabine hazır gir.|Step into the booth ready.
Pisti sen yönet.|Own the dance floor.
Keşiften sahneye her kararın burada. Parçanı bul, akışını kur, geçişini prova et.|Every decision from discovery to the stage lives here. Find the track, build the flow, rehearse the blend.
`;
export const englishCopy: Record<string,string> = Object.fromEntries(entries.trim().split('\n').map(line=>{const i=line.indexOf('|');return[line.slice(0,i),line.slice(i+1)];}));
export function translateUi(text:string,language:Language){
 if(language!=='en')return text;
 const trimmed=text.replace(/\s+/g,' ').trim();
 const translated=englishCopy[trimmed];
 if(translated)return text.replace(text.trim(),translated);
 const memory=trimmed.match(/^Hafıza: (\d)\/5$/);if(memory)return `Memory: ${memory[1]}/5`;
 const search=trimmed.match(/^“(.*)” için ara$/);if(search)return `Search for “${search[1]}”`;
 const difference=trimmed.match(/^([\d.]+) BPM fark$/);if(difference)return `${difference[1]} BPM difference`;
 const estimated=trimmed.match(/^(\d+) parçanın BPM \/ key bilgisi önizlemeden tahmin edildi\. Kulağınla doğrula\.$/);if(estimated)return `Estimated BPM / key for ${estimated[1]} tracks from previews. Confirm by ear.`;
 const target=trimmed.match(/^(.*) içine eklendi$/);if(target)return `Added to ${target[1]}`;
 const count=trimmed.match(/^(\d+) parça hazır$/);if(count)return `${count[1]} tracks ready`;
 const toast=trimmed.match(/^(.*) Library’ye eklendi$/);if(toast)return `${toast[1]} added to Library`;
 const crate=trimmed.match(/^(.*) crate’ine eklendi$/);if(crate)return `Added to ${crate[1]} crate`;
 return text;
}
