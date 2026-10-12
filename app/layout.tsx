import type { Metadata, Viewport } from 'next';
import './globals.css';
import './stage.css';
export const metadata:Metadata={title:'MixNotes — DJ Studio',description:'Müziğini keşfet, Smart Crates ile düzenle, setini hazırla ve prova geçmişini takip et.',manifest:'/manifest.webmanifest',icons:{icon:'/favicon.svg',apple:'/apple-touch-icon.png'},appleWebApp:{capable:true,title:'MixNotes',statusBarStyle:'black-translucent'}};
export const viewport:Viewport={themeColor:'#19151d',viewportFit:'cover'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr" className="dark"><body>{children}</body></html>}
