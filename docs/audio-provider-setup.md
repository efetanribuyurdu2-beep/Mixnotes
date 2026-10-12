# MixNotes provider setup

Founder access is pinned to the authenticated account via the server-only
MIXNOTES_FOUNDER_EMAIL runtime secret. There is no client-side grant endpoint.
Payments and Academy collaboration are not activated in this release.

## Music AI

The adapter follows https://music.ai/docs/api/reference/.
An externally provisioned Music AI account and enabled stem workflow are required.
Configure runtime secrets through Sites environment settings, then deploy:

- MUSIC_AI_API_KEY: application API key, server-only secret.
- MUSIC_AI_WORKFLOW: stem workflow slug from that account.
- MUSIC_AI_INPUT_KEY: optional workflow audio URL parameter; defaults to inputUrl.

The UI stays unavailable until key and workflow are configured. Upload requires
explicit consent. Jobs are scoped to the authenticated owner; output URLs only
come from a job created by that owner. Uploads are bounded to 25 MB. Daily job
limit is 10. Results are retrieved manually; provider output links may expire.
Downloaded stems can be attached to each deck and mixed in Transition Lab.
No live provider processing was tested without credentials.

## Hardware

FLX2 and FLX4 use MIDI Learn; no factory or certified device mapping is claimed.
Supported browsers request MIDI permission with sysex disabled. Four button
commands are available: audition, stop, save, and next transition effect.
Mappings are stored per user, device profile and browser. Jog wheels, headphone
cue routing, audio interface switching and continuous fader control are not
implemented. iPad browsers without Web MIDI use the rekordbox/djay companion
workflow. Physical devices were not available for verification.

## Storage

R2 BUCKET stores private original audio copies, with 1 GB per owner and 25 MB
per file. Original browser storage remains optional. Audio files are not
embedded in metadata JSON backups. Stem files remain device-local. Studio
versions, practice checklists and personal techniques are saved in D1.
