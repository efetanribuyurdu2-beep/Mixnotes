import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'MixNotes — DJ Studio',description:'Müziğini keşfet, Smart Crates ile düzenle, setini hazırla ve prova geçmişini takip et.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="tr" className="dark"><body>{children}</body></html>}
