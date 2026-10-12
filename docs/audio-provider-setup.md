# MixNotes provider setup

Founder access is pinned to the authenticated account via the server-only
MIXNOTES_FOUNDER_EMAIL runtime secret. There is no client-side grant endpoint.
Academy collaboration is not activated in this release. Pro payments run through
Stripe once the secrets below are configured; without them no payment UI is shown.

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

## Stripe (Pro subscriptions)

Billing stays fully disabled until all four server-only secrets are set in the
Sites environment:

- STRIPE_SECRET_KEY: `sk_test_…` while testing, `sk_live_…` in production.
- STRIPE_WEBHOOK_SECRET: `whsec_…` signing secret of the webhook endpoint.
- STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY: recurring `price_…` IDs of the
  Pro product. The prices shown on the Plans page come from the founder's plan
  settings, so keep them equal to these Stripe prices.

In the Stripe dashboard, add a webhook endpoint at
`https://<site>/api/billing/webhook` for `checkout.session.completed` and
`customer.subscription.created|updated|deleted`, and enable the Customer
Portal. The webhook route takes no user session; every event is verified
against the signing secret (5-minute replay window) before it changes data.
If the site's access policy requires sign-in for every route, Stripe cannot
reach the webhook: allow `/api/billing/webhook` publicly. Active, trialing and
past-due subscriptions grant Pro (full access) until one day after the paid
period ends. Card data is handled only on Stripe-hosted pages. Live payments
were not exercised; flows were verified with mocked Stripe responses.

## Spotify playlist export

Exporting a set to Spotify needs the `playlist-modify-private` scope, added in
this release. Accounts connected earlier are asked to reconnect the first time
they export. Tracks with a Spotify source are used as-is; others take the top
search result, and misses are listed to the user. Spotify Developer Mode only
allows the app's registered test users.

## Shared set links

`/s/<token>` pages are public by design and show only titles, artists, BPM,
key and length. If the site's access policy requires sign-in, these links also
require it.
