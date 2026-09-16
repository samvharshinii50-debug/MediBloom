# MediBloom — project documentation & judge Q&A

Everything you need to present MediBloom and answer what gets asked.
Each question has a **Say this** (short, for anyone) and **If they push** (the
technical version). Never bluff — the honest answers below are stronger than
anything invented on the spot.

---

## 1. The 30-second version

> Half of all long-term medicine is taken wrongly, and in India people buy
> painkillers over the counter without anyone checking what else they're on.
> MediBloom is an Android app that checks every pair of your medicines against a
> bundled clinical reference, reminds you when doses are due, and explains the
> risk in plain language — with a safer alternative where one exists.
> It works with the network switched off, it costs nothing to run, and there is
> no account and no server.

**The demo line:** *"Turn off wifi and mobile data and do the whole demo again. Nothing changes."*

---

## 2. Numbers cheat sheet

| | |
|---|---|
| Interaction rules | **134** — 73 severe, 55 moderate, 6 mild |
| Generic drugs covered | **130** |
| Brand/alias mappings | **398**, weighted to Indian pharmacy names |
| Rules offering a safer swap | **19** |
| Automated tests | **221**, all passing |
| Screens | **12** |
| Pure logic engines | **6** (nlu, assistant, interactions, insights, schedule, parser) |
| APK size | ~139 MB (all four CPU architectures, unminified) |
| Package | `com.medibloom.app`, signed release build |
| Cost to run, per user, forever | **₹0** |

---

## 3. The demo script (90 seconds)

Load **Settings → Load demo data** before you start.

1. **Home.** *"This is Lakshmi, 68, from Chennai."* Point at the red banner:
   Warfarin + Meftal. The insight card below is generated from her real dose log.
2. **Tap the banner → Interactions.** Read the severe card. Land on
   **Meftal → Acetaminophen** — *"we don't just warn, we say what to take instead,
   and we swap the painkiller, never the anticoagulant."*
   Optionally tap **Explain this to me** for the AI detail.
3. **Medicines → Upload a prescription → Try our sample.** Real OCR text through
   the real parser. Every Indian brand resolves; one deliberate misread is flagged
   *"Please check this"* with suggestions. *"Nothing saves until she confirms."*
4. **Assistant.** Type `what did I have today` — instant, offline. Then
   `my knee is hurting what can I take` — goes to the model, comes back warning
   her off more Meftal.
5. **Settings → Send a test reminder.** Pull down the shade: Mark taken / Snooze /
   Skip live on the notification. Tap Mark taken, return Home — it's ticked off.
6. **Close on the numbers**, then the airplane-mode line.

### If something breaks mid-demo

- **Chat is slow or errors** → it falls back to on-device automatically and says so.
  Say: *"That's the fallback working — the network died and the app carried on."*
- **Notification doesn't fire** → emulator/phone battery optimisation. Use
  Settings → Send a test reminder instead.
- **OCR fails on a photo** → use **Try our sample prescription**, which runs the
  identical parser on known-good text.
- **Nothing at all works** → open the Interactions screen. It needs no network,
  no permissions and no notifications.

---

## 4. Product questions

### "What problem are you actually solving?"
**Say this:** Two problems that are usually treated separately. People forget
doses, and people take combinations that hurt them. Reminder apps do the first.
Interaction checkers do the second, and need the internet. Nobody does both,
offline, for the person most at risk.

**If they push:** WHO puts adherence to long-term therapy at roughly 50% in
developed countries. Polypharmacy — five or more medicines — roughly doubles
adverse-event risk, and it's the norm for older adults. In India a large share of
medicine is bought without a prescription, so nobody has the full list. Our demo
is built on exactly that scenario.

### "Who is this for?"
**Say this:** Older adults and women managing several long-term medicines,
especially in Indian households where medicines get bought over the counter.

**If they push:** That choice drove real decisions. The time picker is big +/−
buttons rather than a spinner because a spinner defeats shaky hands. Text has a
larger-text mode and voice read-aloud. The interaction dataset was extended with
the medicines those people actually take — Meftal, Shelcal, Thyronorm, Nurokind,
Livogen, Osteofos — not just hospital medicine.

### "Why not just use 1mg / Practo / Medisafe?"
**Say this:** They need an account and a connection, and they're built for
people like us. We're offline-first and designed around someone reading a strip
in a kitchen in Thanjavur.

**If they push:** Concretely: reminder apps don't do interaction checking at all;
web interaction checkers don't know your schedule and can't remind you; neither
handles a brand name off an Indian strip. And every one of them needs a login.
MediBloom is one install, one person, no account.

### "What's the Smart Swap?"
**Say this:** When two medicines clash and one of them has a safer alternative,
we name it. 19 of our 134 rules carry one.

**If they push:** It's a field on the rule, not a generated suggestion, so it's
auditable. Direction matters: `swapFor` replaces drug `b`, and there's a test
that bars 17 critical drugs — warfarin, insulin, digoxin, levothyroxine,
lithium, methotrexate and others — from ever being the swap target. We added
that test because we shipped this bug and caught it in testing: the chip once
read *"Warfarin → Paracetamol"*, which would have told a patient to replace her
anticoagulant with a painkiller.

---

## 5. Technical questions

### "How does it work offline?"
**Say this:** Everything that matters is in the APK. The interaction rules are a
TypeScript array compiled into the bundle, the data is in SQLite on the phone,
reminders are Android alarms, and OCR is Google ML Kit running locally. There's
no backend to be offline from.

**If they push:** The checker is an O(1) `Map` built at module load, keyed on the
sorted pair of generic names, so checking every pair of N medicines is N²/2 map
lookups — instant at any realistic N. Notifications are `DAILY` triggers handed
to Android's AlarmManager, so they fire whether or not the app is running.

### "Where does the drug data come from?"
**Say this:** It's hand-built for this project — 134 well-established,
textbook-level interactions. It is **not** a certified drug database, and we say
so before anyone asks.

**If they push:** Scope rules we wrote down and enforced: only widely documented
pairs; `severe` reserved for contraindicated or seriously risky combinations;
class effects written out member by member rather than inferred; plain language,
no clinical shorthand; every `guidance` string points at a doctor or pharmacist —
there's a test that fails if one doesn't. **The honest limitation:** it needs
pharmacist review before real patients, and the distribution skews severe (73 of
134) because we concentrated on bleeding, serotonin, potassium and QT risks
rather than trying to be comprehensive.

### "Did you train a model?"
**Say this:** No, and deliberately. Training a model on drug interactions means
it can hallucinate one, and in this domain a plausible-sounding invented
interaction is worse than no answer. Ours is a deterministic lookup — every
warning traces to a specific rule we can show you.

**If they push:** Where we do use a model it's tightly bounded: it gets a short
factual block of the user's own data and is instructed to answer only from it;
it's never the source of an interaction; and when it suggests a medicine name
from a prescription, we throw the suggestion away unless it resolves against our
own bundled reference. It cannot invent a drug into the app.

### "So where *is* the AI?"
**Say this:** For open-ended questions the rules can't cover — "my knee is
hurting, what can I take". Factual questions about your own log are answered
instantly on-device, because the rule engine is exact and a model just adds
latency.

**If they push:** The split is a boolean on the answer object, `AssistantAnswer.exact`,
and it's unit-tested. Eight intents are exact: doses taken, doses pending, next
dose, did-I-take, list medicines, schedule, adherence, streak. Everything else can
go to the model. We made the split after measuring it — the model took ~10s and
once rendered a **skipped** dose as *"you took it"*, which is exactly the kind of
error you can't ship in a medication app.

### "What if the AI is down, or rate-limited, or the wifi dies?"
**Say this:** The rule engine answers instead and the message says so. We tested
it with a deliberately invalid key — the chat still answered correctly and showed
*"Cloud assist unavailable — that key was rejected"* underneath.

### "How does the natural-language part work without a model?"
**Say this:** A small NLU layer we wrote: it normalises what you typed, works out
*when* you mean, works out *what* you're asking, and hands both to the answer engine.

**If they push:** `src/engines/nlu.ts`. Normalisation expands contractions and folds
synonyms ("meds"/"pills"/"tablets" → "medicine"). Timeframe parsing handles today,
yesterday, last night, "3 days ago", this/last week, rolling windows, named weekdays
and parts of day. Intent classification is weighted regex patterns that *score* rather
than first-match, so a sentence hitting two intents resolves to the stronger one. That
design caught a real bug: "what **can** I take" was scoring as "what **did** I take"
until we made the dose-log patterns past-tense only.

### "How does the prescription scanning work?"
**Say this:** Google ML Kit reads the text on the phone. Our parser pulls out drug
names, doses and frequencies, resolves brand names to generics, and shows you what
it saw before anything is saved.

**If they push:** PDFs get rasterised first by a local Expo module we wrote around
Android's own `PdfRenderer` — the third-party library for this was unmaintained and
wouldn't compile, so we wrapped the framework API in about 60 lines of Kotlin. One
detail that matters: the bitmap is erased to white before rendering, because a
transparent background renders black and destroys OCR accuracy. Name extraction
scans 1-, 2- and 3-word windows against the synonym table so it works on a table row
rather than needing a clean line. Anything below a 0.72 confidence threshold is
flagged *"Please check this"* with fuzzy-matched suggestions — we never silently
guess a drug name.

### "How do the reminders survive a reboot / the app being closed?"
**Say this:** They're Android alarms, not something our app polls for. We request
`SCHEDULE_EXACT_ALARM` and `RECEIVE_BOOT_COMPLETED`.

**If they push:** The honest caveat: several manufacturers — Xiaomi, Oppo, Vivo,
Samsung — aggressively kill background alarms unless the app is whitelisted from
battery optimisation. That's a known Android-wide problem, not something we can
fully solve, and the right fix is walking the user through the exemption on first
run.

### "Why does the notification have buttons?"
**Say this:** So marking a dose takes one tap from the lock screen without opening
the app. Mark taken / Snooze 10m / Skip, using notification categories with
`opensAppToForeground: false` — the tap writes straight to SQLite.

### "How do you send email for free without a server?"
**Say this:** We don't send it — the user's own account does. They point MediBloom
at either a ten-line Google Apps Script running on their own Gmail, or an EmailJS
free tier. Either way there's no MediBloom server and no mail password stored.

**If they push:** Sending silently from the app would mean embedding SMTP
credentials in an APK, which is a credential leak waiting to happen. With no relay
configured it falls back to a notification carrying a fully pre-written email — one
tap sends it from the user's own mail app. That path needs zero setup.

---

## 6. Data, privacy and safety

### "Where is the user's data stored?"
**Say this:** In a SQLite database on the phone, and nowhere else. No account,
no analytics, no tracking, no server to breach.

**If they push:** Three tables — medicines, dose_log, settings. API keys go in the
Android keystore via `expo-secure-store`, never in the database. The only data that
can leave the phone is: a short factual summary sent with each AI question, if the
user turns cloud assist on; and the caregiver email, if they set one up. Both are
opt-in, both are labelled in the UI, and Settings says in plain words what leaves.

### "Isn't giving medical advice risky?"
**Say this:** We're careful not to. The app surfaces documented interactions and
tells people to talk to a pharmacist. It doesn't diagnose, doesn't prescribe and
doesn't change doses.

**If they push:** Enforced in code, not just intent. Every `guidance` string must
reference a professional — there's a test. The assistant refuses to guess at side
effects and says so. It won't invent a food-timing rule. The Safety & Ethics screen
in the app states the limits. And the swap direction test exists specifically so the
app can never suggest dropping a critical medicine.

### "What about the AI saying something dangerous?"
**Say this:** It's constrained three ways: it only sees the user's own data, it's
told to answer only from that, and the interaction warning shown alongside always
comes from our own rules, not the model.

**If they push:** The system prompt bars inventing a dose, time, medicine, side
effect or interaction; bars suggesting starting, stopping or changing a dose; and
requires pointing at a pharmacist for anything clinical. Answers are capped at three
sentences. The UI labels every message with its source. For OCR, model output is
validated against `KNOWN_GENERICS` and discarded if it doesn't resolve — it cannot
add a medicine we don't recognise.

---

## 7. Accessibility — how would an elderly person actually use this?

**Say this:** That question shaped the design more than any other.

- **Larger-text mode** scales the whole type system, not just body text
- **Voice read-aloud** speaks the medicine and dose
- **Touch targets ≥44px** everywhere
- **The time picker is big +/− buttons**, not a spinner — a spinner is precisely
  what someone with shaky hands or poor eyesight cannot use
- **Plain words throughout** — "Careful with this combo", not "Contraindication"
- **Colour is never the only signal** — every status has a text label too
- **Nothing to log into**, ever
- **Caregiver alerts** exist because the realistic answer is that a daughter or son
  helps, so the app should loop them in rather than pretend otherwise

**If they push on onboarding:** The load-demo-data path means a family member can
set the phone up in two minutes. Brand-name resolution matters here too — they type
"Shelcal", the name on the strip, not "calcium carbonate".

---

## 8. Cost, scale and business

### "What does it cost to run?"
**Say this:** ₹0 per user, forever. No servers, no database bills, no API costs in
the default path.

| Component | Cost |
|---|---|
| Servers | none — there is no backend |
| Database | SQLite on the device |
| Interaction data | bundled in the APK |
| OCR | Google ML Kit, on-device, free |
| Notifications | Android AlarmManager, free |
| AI *(optional)* | Groq/Gemini/OpenRouter free tier |
| Email *(optional)* | user's own Gmail via Apps Script, or EmailJS free tier |

### "How does this scale to a million users?"
**Say this:** It already does, because there's nothing to scale. Every install is
independent. A million users is a million phones doing their own work — our costs
stay at zero.

**If they push:** The trade is no cross-device sync and no central analytics. For
this product that's a feature: health data that never leaves the device can't be
breached. If we ever needed sync, it'd be opt-in and end-to-end encrypted.

### "How would you make money / sustain it?"
**Say this:** It doesn't need to make money to keep running, which is the point.
A realistic path is institutional — hospitals or pharmacy chains distributing a
branded build, paying for the pharmacist review and the dataset maintenance rather
than per-user infrastructure.

---

## 9. Build, testing and engineering process

### "How do you know it works?"
**Say this:** 221 automated tests over the logic, plus we drove the real signed
APK on a device with adb — every screen, every flow.

**If they push:** The engines are deliberately free of React Native and Expo imports
so they run under plain ts-jest with no native mocking. Tests cover the NLU layer,
the assistant across ~35 phrasings including gibberish and an empty database, the
parser against four prescription layouts, the interaction dataset's own invariants,
the schedule and insight maths, the email relay, and the demo profile itself so the
demo can't silently break.

### "Give an example of a bug your testing caught."
Three good ones, all real:

1. **The splash screen never hid.** `hideAsync` was in an `onLayout` callback that
   fired before SQLite finished opening, so it did nothing and never fired again.
   The app looked frozen and silently swallowed every tap. Moved to an effect keyed
   on `ready`, plus a five-second failsafe.
2. **41 brand names silently failed to resolve** — Crestor, Losar, Aten, Allegra —
   because their generic appeared in no interaction rule. Recognising a drug and
   having nothing to warn about are different things; the code was conflating them.
3. **A swap chip read "Warfarin → Paracetamol".** The a/b order on two new rules was
   backwards. Now barred in code with a test.

### "What was the hardest technical problem?"
**Say this:** Getting the keyboard to stop covering the text field on modern Android.

**If they push:** Android is edge-to-edge from Expo SDK 54 on, so the window no
longer resizes for the keyboard and both `adjustResize` and `KeyboardAvoidingView`
stop working. We listened to the keyboard directly — and then found Android reports
the IME height *excluding* the gesture-bar inset while drawing the keyboard over it.
We instrumented it on-device rather than guessing: reported 312dp, actually covering
336dp, 24dp gesture inset. Adding the inset back fixed it everywhere at once.

Honourable mention: a fully controlled `TextInput` backed by the encrypted keystore
dropped characters, because each async write landed after the next keystroke and
React re-rendered with the stale string. Fixed with a buffered input that commits on
debounce and blur.

---

## 10. Full tech stack

### App
| | |
|---|---|
| Framework | React Native 0.86.3 · Expo SDK 57 · React 19.2.3 |
| Language | TypeScript, `strict` |
| Navigation | React Navigation 7 — bottom tabs + native stack |
| Graphics | react-native-svg 15 (all icons and the logo are hand-drawn SVG) |
| Fonts | DM Serif Display + Nunito via `@expo-google-fonts` |
| Layout | react-native-safe-area-context, react-native-screens |

### On-device services
| | |
|---|---|
| Database | `expo-sqlite` |
| Reminders | `expo-notifications` — DAILY triggers, notification categories with action buttons |
| OCR | `@react-native-ml-kit/text-recognition` (Google ML Kit), lazy-loaded in a try/catch |
| PDF rendering | local Expo module wrapping Android `PdfRenderer` (Kotlin) |
| Secrets | `expo-secure-store` (Android Keystore) |
| Speech | `expo-speech` |
| Camera / files | `expo-image-picker`, `expo-document-picker`, `expo-file-system` |
| Mail fallback | `expo-mail-composer` |

### Optional network services
| Service | Used for | Cost |
|---|---|---|
| **Groq** (`openai/gpt-oss-120b`) | open-ended assistant answers, interaction explanations, OCR second pass | free tier |
| Google AI Studio / OpenRouter | same, as alternatives | free tier |
| **EmailJS** | automatic caregiver alerts and daily digest | free, 200/month |
| Google Apps Script | same, using the user's own Gmail | free |

### Build & tooling
| | |
|---|---|
| Build | Gradle `assembleRelease`, signed with a local keystore |
| Tests | Jest + ts-jest, 221 tests |
| Device testing | adb-driven UI automation (tap, text, screencap, uiautomator dumps, logcat) |
| Asset generation | Python + headless Chrome — icons and demo prescriptions both generated from source, so they can't drift |

---

## 11. Architecture in one picture

```
┌──────────────────────── the phone ────────────────────────┐
│                                                           │
│  12 screens  ──►  AppStore (React context)                │
│                        │                                  │
│                        ▼                                  │
│              ┌──── pure engines ────┐                     │
│              │ interactions  nlu    │  no RN/Expo imports │
│              │ assistant     parser │  → unit-testable    │
│              │ insights      schedule                     │
│              └──────────┬───────────┘                     │
│                         │                                 │
│     ┌───────────────────┼───────────────────┐             │
│     ▼                   ▼                   ▼             │
│  SQLite            AlarmManager          ML Kit           │
│  (all data)        (reminders)           (OCR)            │
│                                                           │
└─────────────────────────┬─────────────────────────────────┘
                          │ optional, opt-in, fails soft
                          ▼
              Groq  ·  EmailJS / Apps Script
```

The important property: **remove the bottom box entirely and the app still does
its job.** Interaction checking, reminders, the dose log, the schedule, adherence
and the assistant's factual answers are all above the line.

---

## 12. Honest limitations

1. **The dataset is not certified.** 134 hand-written rules. It needs pharmacist
   review before real patients, and it skews severe.
2. **Handwriting OCR is unreliable.** By design we show what was read and ask,
   rather than guessing a drug name.
3. **Background alarms can be throttled** by some Android manufacturers.
4. **Cloud assist sends data off the phone.** Optional, labelled, off in any build
   without a bundled key.
5. **This demo build ships API keys** in `app/src/data/defaults.ts` so it works
   with no setup. An APK is a zip — revoke and blank them before sharing widely.
6. **The APK is ~139 MB** because it bundles all four CPU architectures unminified.
   An arm64-only release build would be roughly 40 MB.
7. **No cross-device sync**, deliberately.

---

## 13. Where things live

| What | Where |
|---|---|
| Interaction rules | `app/src/data/interactions.ts` |
| Brand names | `app/src/data/drugSynonyms.ts` |
| Demo profile | `app/src/data/demoSeed.ts` |
| Bundled credentials | `app/src/data/defaults.ts` ⚠ |
| Language understanding | `app/src/engines/nlu.ts` |
| Assistant answers | `app/src/engines/assistantEngine.ts` |
| Prescription parser | `app/src/engines/prescriptionParser.ts` |
| Optional AI | `app/src/services/ai.ts` |
| Email relay | `app/src/services/emailRelay.ts` |
| PDF module (Kotlin) | `app/modules/pdf-render/` |
| Tests | `app/__tests__/` |
| Build script | `scripts/build-release-apk.sh` |
| Icon generator | `scripts/generate-icons.py` |
| Prescription generator | `scripts/generate-prescriptions.py` |
| Deck generator | `scripts/generate-deck.py` |

---

*MediBloom provides general medication-safety support. It does not diagnose,
prescribe, or replace a doctor or pharmacist. In an emergency, contact local
emergency services.*
