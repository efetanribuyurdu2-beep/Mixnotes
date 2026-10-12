import {refreshSpotifyMetadata,SpotifyError} from "@/lib/spotify-server";
import {env} from "cloudflare:workers";
import {enforcePlan,PlanError} from "@/db/membership";
import { avatarIds } from "@/lib/avatars";
import { database } from "@/db/raw";
import { createSession, importTracks, restoreBackup, addSource, ExtensionError } from "@/db/workspace-extensions";
import { audioSettingsSchema, linkMetadataSchema, smartRuleSchema, sessionInputSchema, importedTrackSchema, backupSchema } from "@/lib/workspace-validation";
import {
  addTrackToCrate,
  addTrackToSet,
  createCrate,
  createSet,
  createTrack,
  createTransition,
  deleteCrate,
  deleteSet,
  deleteTrack,
  deleteTransition,
  identityFromRequest,
  prepareWorkspace,
  readWorkspace,
  removeTrackFromCrate,
  removeTrackFromSet,
  reorderSet,
  updateCrate,
  updateSet,
  updateTrack,
  updateTransition,
  WorkspaceError,
} from "@/db/workspace";
import { z } from "zod";

const shortText = z.string().trim().max(200);
const notes = z.string().max(10_000);
const id = z.string().uuid();

const trackInput = z.object({
  linkMetadata: linkMetadataSchema.nullable().optional(),
  title: z.string().trim().min(1).max(200),
  artist: shortText,
  version: shortText,
  bpm: z.number().min(1).max(999).nullable(),
  musicalKey: z.string().trim().max(20),
  genre: z.string().trim().max(100),
  subgenre: z.string().trim().max(100),
  energy: z.number().int().min(1).max(5).nullable(),
  rating: z.number().int().min(0).max(5),
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
  origin: z.enum(["discovery", "library"]),
  notes,
  cueNotes: z.string().max(1_000),
  introNotes: z.string().max(1_000),
  outroNotes: z.string().max(1_000),
  durationSeconds: z.number().int().min(1).max(86_400).nullable(),
  label: shortText,
  sourceProvider: z.string().trim().max(100),
  sourceUrl: z
    .string()
    .trim()
    .max(2_000)
    .refine((value) => value === "" || /^https?:\/\//i.test(value), "Geçerli bir bağlantı gir."),
});

const crateInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().max(1_000),
  rules: smartRuleSchema.nullable().optional(),
});

const setInput = z.object({
  title: z.string().trim().min(1).max(200),
  genre: z.string().trim().max(100),
  eventDate: z.string().max(20),
  notes,
  status: z.enum(["draft", "ready", "performed"]),
});

const transitionInput = z.object({
  audioSettings: audioSettingsSchema.nullable().optional(),
  fromTrackId: id.nullable(),
  toTrackId: id.nullable(),
  transitionType: z.string().trim().max(100),
  mixOutPoint: z.string().trim().max(100),
  mixInPoint: z.string().trim().max(100),
  eqTechnique: z.string().trim().max(500),
  fxNotes: z.string().max(1_000),
  timingNotes: z.string().max(1_000),
  notes,
  rating: z.number().int().min(0).max(5),
  difficulty: z.number().int().min(0).max(5),
  practiceStatus: z.enum(["idea", "practice", "ready"]),
  lastPracticed: z.string().max(20),
});

const actionSchema = z.discriminatedUnion("type", [
  z.object({type:z.literal("spotify.metadata.refresh"),ids:z.array(id).min(1).max(5).refine(ids=>new Set(ids).size===ids.length)}),
  z.object({type:z.literal("profile.avatar"),avatarId:z.enum(avatarIds)}),
  z.object({type:z.literal("profile.language"),language:z.enum(["tr","en"])}),
  z.object({type:z.literal("source.add"),trackId:id,input:z.object({provider:shortText.min(1),url:z.string().url().max(2000).refine(s=>/^https?:\/\//i.test(s)),availability:z.enum(["reference","owned","purchase","pool"])})}),
  z.object({type:z.literal("source.delete"),trackId:id,id:z.string().max(100)}),
  z.object({type:z.literal("session.create"),input:sessionInputSchema}),
  z.object({type:z.literal("session.delete"),id}),
  z.object({type:z.literal("tracks.audio.import"),inputs:z.array(importedTrackSchema).min(1).max(20)}),
  z.object({type:z.literal("tracks.import"),inputs:z.array(importedTrackSchema).min(1).max(200)}),
  z.object({type:z.literal("backup.import"),backup:backupSchema}),
  z.object({ type: z.literal("track.create"), input: trackInput }),
  z.object({ type: z.literal("track.update"), id, expectedRevision: z.number().int().positive(), input: trackInput }),
  z.object({ type: z.literal("track.delete"), id, expectedRevision: z.number().int().positive() }),
  z.object({ type: z.literal("crate.create"), input: crateInput }),
  z.object({ type: z.literal("crate.update"), id, expectedRevision: z.number().int().positive(), input: crateInput }),
  z.object({ type: z.literal("crate.delete"), id, expectedRevision: z.number().int().positive() }),
  z.object({ type: z.literal("crate.track.add"), crateId: id, trackId: id }),
  z.object({ type: z.literal("crate.track.remove"), crateId: id, trackId: id }),
  z.object({ type: z.literal("set.create"), input: setInput }),
  z.object({ type: z.literal("set.update"), id, expectedRevision: z.number().int().positive(), input: setInput }),
  z.object({ type: z.literal("set.delete"), id, expectedRevision: z.number().int().positive() }),
  z.object({ type: z.literal("set.track.add"), setId: id, trackId: id }),
  z.object({ type: z.literal("set.track.remove"), setId: id, trackId: id }),
  z.object({ type: z.literal("set.reorder"), setId: id, trackIds: z.array(id).max(500) }),
  z.object({ type: z.literal("transition.create"), input: transitionInput }),
  z.object({
    type: z.literal("transition.update"),
    id,
    expectedRevision: z.number().int().positive(),
    input: transitionInput,
  }),
  z.object({ type: z.literal("transition.delete"), id, expectedRevision: z.number().int().positive() }),
]);

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  const identity = await identityFromRequest(request);
  if (!identity) {
    return Response.json({ error: "Oturum doğrulanamadı. Sayfayı yenileyip tekrar dene." }, { status: 401 });
  }

  try {
    await prepareWorkspace(identity.id, !identity.isAutomation);
    const body=await request.text();
    if(body.length>4_000_000)return Response.json({error:"İçe aktarım 4 MB sınırını aşıyor."},{status:413});
    const action = actionSchema.parse(JSON.parse(body));

    await enforcePlan(identity.id,action);
    switch (action.type) {
      case "spotify.metadata.refresh": await refreshSpotifyMetadata(identity.id,action.ids);break;
      case "profile.avatar": await database().prepare("INSERT INTO user_preferences (owner_id,avatar_id) VALUES (?,?) ON CONFLICT(owner_id) DO UPDATE SET avatar_id=excluded.avatar_id").bind(identity.id,action.avatarId).run();break;
      case "profile.language": await database().prepare("INSERT INTO user_preferences (owner_id,language) VALUES (?,?) ON CONFLICT(owner_id) DO UPDATE SET language=excluded.language").bind(identity.id,action.language).run();break;
      case "source.add": await addSource(database(),identity.id,action.trackId,action.input);break;
      case "source.delete": await database().prepare("DELETE FROM track_sources WHERE owner_id=? AND track_id=? AND id=?").bind(identity.id,action.trackId,action.id).run();break;
      case "session.create": await createSession(database(),identity.id,action.input);break;
      case "session.delete": await database().prepare("DELETE FROM practice_sessions WHERE owner_id=? AND id=?").bind(identity.id,action.id).run();break;
      case "tracks.audio.import": await importTracks(database(),identity.id,action.inputs,true);break;
      case "tracks.import": await importTracks(database(),identity.id,action.inputs);break;
      case "backup.import": await restoreBackup(database(),identity.id,action.backup);break;
      case "track.create":
        await createTrack(identity.id, action.input);
        break;
      case "track.update":
        await updateTrack(identity.id, action.id, action.expectedRevision, action.input);
        break;
      case "track.delete":
        await deleteTrack(identity.id, action.id, action.expectedRevision);
        try{const bucket=(env as unknown as {BUCKET?:R2Bucket}).BUCKET;if(bucket){await bucket.delete(`audio/${identity.id}/${action.id}`);await database().prepare('DELETE FROM cloud_audio WHERE owner_id=? AND track_id=?').bind(identity.id,action.id).run();}}catch(error){console.error('Cloud audio cleanup failed',error);}
        break;
      case "crate.create":
        await createCrate(identity.id, action.input);
        break;
      case "crate.update":
        await updateCrate(identity.id, action.id, action.expectedRevision, action.input);
        break;
      case "crate.delete":
        await deleteCrate(identity.id, action.id, action.expectedRevision);
        break;
      case "crate.track.add":
        await addTrackToCrate(identity.id, action.crateId, action.trackId);
        break;
      case "crate.track.remove":
        await removeTrackFromCrate(identity.id, action.crateId, action.trackId);
        break;
      case "set.create":
        await createSet(identity.id, action.input);
        break;
      case "set.update":
        await updateSet(identity.id, action.id, action.expectedRevision, action.input);
        break;
      case "set.delete":
        await deleteSet(identity.id, action.id, action.expectedRevision);
        break;
      case "set.track.add":
        await addTrackToSet(identity.id, action.setId, action.trackId);
        break;
      case "set.track.remove":
        await removeTrackFromSet(identity.id, action.setId, action.trackId);
        break;
      case "set.reorder":
        await reorderSet(identity.id, action.setId, action.trackIds);
        break;
      case "transition.create":
        await createTransition(identity.id, action.input);
        break;
      case "transition.update":
        await updateTransition(identity.id, action.id, action.expectedRevision, action.input);
        break;
      case "transition.delete":
        await deleteTransition(identity.id, action.id, action.expectedRevision);
        break;
    }

    return Response.json(await readWorkspace(identity), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if(error instanceof PlanError)return Response.json({error:error.message},{status:403});
    if (error instanceof z.ZodError) {
      return Response.json({ error: "Bilgileri kontrol et; zorunlu veya hatalı bir alan var." }, { status: 400 });
    }
    if (error instanceof SpotifyError || error instanceof WorkspaceError || error instanceof ExtensionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Workspace action failed", error);
    return Response.json(
      { error: "Değişiklik kaydedilemedi. Yazdıkların ekranda kalacak; tekrar dene." },
      { status: 503 },
    );
  }
}
