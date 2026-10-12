import { identityFromRequest } from "@/db/workspace";

export async function GET(request:Request) {
  if(!await identityFromRequest(request)) return Response.json({error:"Oturum doğrulanamadı."},{status:401});
  const query=new URL(request.url).searchParams.get("q")?.trim()??"";
  if(query.length<2||query.length>100)return Response.json({error:"2–100 karakterlik bir arama gir."},{status:400});
  const url=new URL("https://itunes.apple.com/search");
  url.search=new URLSearchParams({term:query,media:"music",entity:"song",limit:"24",country:"TR"}).toString();
  try {
    const response=await fetch(url,{signal:AbortSignal.timeout(8000),headers:{Accept:"application/json"}});
    if(!response.ok)throw new Error("provider unavailable");
    const payload=await response.json() as {results?:{trackId:number;trackName:string;artistName:string;primaryGenreName?:string;trackTimeMillis?:number;trackViewUrl?:string}[]};
    const results=(payload.results??[]).filter(r=>r.trackName&&r.artistName&&r.trackViewUrl?.startsWith("https://")).map(r=>({id:String(r.trackId),title:r.trackName,artist:r.artistName,genre:r.primaryGenreName??"",durationSeconds:r.trackTimeMillis?Math.round(r.trackTimeMillis/1000):null,url:r.trackViewUrl!}));
    return Response.json({results,provider:"iTunes"},{headers:{"Cache-Control":"private, max-age=60"}});
  }catch{return Response.json({error:"Katalog şu anda yanıt vermiyor. Tekrar dene veya kaynaklardan ara."},{status:503});}
}
