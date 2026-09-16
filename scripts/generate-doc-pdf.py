"""
Builds the short MediBloom documentation PDF.

    python scripts/generate-doc-pdf.py   ->  MediBloom-Documentation.pdf

Three A4 pages, deliberately. One person should be able to read this once and
then answer anything a judge asks. The long version lives in DOCUMENTATION.md.
"""

import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "MediBloom-Documentation.pdf")

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

PETALS = [(0, "#E85D8A", .9), (60, "#F4A6C1", .85), (120, "#8B5FBF", .9),
          (180, "#C9B6E4", .85), (240, "#D4A574", .85), (300, "#E85D8A", .8)]
FLOWER = ('<svg width="34" height="34" viewBox="0 0 40 40"><g transform="translate(20,20)">'
          + "".join(f'<ellipse cx="0" cy="-10" rx="5.5" ry="10" fill="{c}" opacity="{o}" '
                    f'transform="rotate({r})"/>' for r, c, o in PETALS)
          + '<circle cx="0" cy="0" r="6.5" fill="#fff"/>'
          + '<rect x="-4" y="-1.4" width="8" height="2.8" rx="1.4" fill="#8B5FBF" '
            'transform="rotate(45)"/></g></svg>')

FEATURES = [
    ("Interaction checking",
     "Every pair of your medicines is checked the moment you add one, against 134 bundled "
     "rules covering 130 generic drugs. Indian brand names resolve automatically — type "
     "\u201cShelcal\u201d, not \u201ccalcium carbonate\u201d."),
    ("Smart Swap",
     "Where a safer alternative exists, the app names it. It always swaps the painkiller, "
     "never the medicine keeping you alive."),
    ("Reminders",
     "Mark taken / Snooze / Skip sit on the notification itself. Exact alarms, survive a reboot."),
    ("Prescription scanning",
     "Photo or PDF, read on the phone by Google ML Kit. It shows what it saw and asks before "
     "saving anything."),
    ("Caregiver alerts",
     "If a dose stays unmarked past your chosen limit, a family member is emailed "
     "automatically."),
    ("Ask MediBloom",
     "A chat that answers from your own dose log. \u201cWhat did I have today?\u201d is "
     "answered instantly on the phone; open-ended questions can go to a free AI model."),
    ("Wellness dashboard",
     "Streak, adherence percentage, a tappable four-week calendar, week-on-week trend and "
     "a per-medicine breakdown \u2014 all from your own history."),
    ("Accessibility",
     "Larger-text mode, voice read-aloud, touch targets of at least 44px, plain language "
     "everywhere, and a time picker built from big + and \u2212 buttons."),
]

STACK = [
    ("App", "React Native 0.86 \u00b7 Expo SDK 57 \u00b7 TypeScript (strict) \u00b7 React Navigation 7"),
    ("Database", "expo-sqlite \u2014 on the phone, the only place data lives"),
    ("Reminders", "expo-notifications \u2014 daily triggers on Android AlarmManager"),
    ("OCR", "Google ML Kit via @react-native-ml-kit/text-recognition \u2014 fully offline"),
    ("PDF reading", "Custom Expo module in Kotlin, wrapping Android\u2019s own PdfRenderer"),
    ("Secrets", "expo-secure-store \u2014 Android Keystore"),
    ("Fonts &amp; icons", "DM Serif Display + Nunito \u00b7 all icons hand-drawn in react-native-svg"),
    ("Build", "Gradle signed release APK \u00b7 Jest (221 tests) \u00b7 adb UI testing on device"),
]

SERVICES = [
    ("Groq", "Optional AI for open-ended questions", "openai/gpt-oss-120b, free tier"),
    ("Google AI Studio / OpenRouter", "Alternative AI providers", "free tier"),
    ("Email\u2009JS", "Sending caregiver alerts automatically", "free, 200 emails a month"),
    ("Google Apps Script", "Alternative: sends via the user\u2019s own Gmail", "free"),
]

NUMBERS = [("134", "interaction rules"), ("130", "generic drugs"),
           ("398", "brand names"), ("221", "tests passing"),
           ("12", "screens"), ("\u20b90", "cost per user")]

DEMO = [
    "Open <b>Settings \u2192 Load demo data</b>. This loads Lakshmi, 68, from Chennai.",
    "<b>Home</b> \u2014 point at the red banner: Warfarin + Meftal. The insight below it is "
    "generated from her real dose log.",
    "<b>Tap the banner \u2192 Interactions.</b> Read the severe card, then the "
    "<b>Meftal \u2192 Acetaminophen</b> swap.",
    "<b>Medicines \u2192 Upload a prescription \u2192 Try our sample.</b> Six medicines parsed; "
    "one deliberate misread flagged \u201cPlease check this\u201d.",
    "<b>Assistant</b> \u2014 type \u201cwhat did I have today\u201d (instant, offline), then "
    "\u201cmy knee is hurting what can I take\u201d (goes to the AI).",
    "<b>Settings \u2192 Send a test reminder.</b> Pull down the shade, tap Mark taken, "
    "return Home \u2014 it is ticked off.",
]

QA = [
    ("How does it work without internet?",
     "Everything is inside the app. The interaction rules are compiled into the APK, the data is "
     "in a SQLite database on the phone, reminders are Android alarms, and the OCR runs locally. "
     "There is no server to be offline from."),
    ("Where does the drug data come from?",
     "We wrote it \u2014 134 well-established, textbook-level interactions. It is not a certified "
     "drug database, and it would need a pharmacist\u2019s review before real patients use it."),
    ("Did you train an AI model?",
     "No. A model that invents a drug interaction is more dangerous than no answer at all. Ours is "
     "a deterministic lookup, so every warning traces back to a rule we can show you."),
    ("So where is the AI used?",
     "Only for open-ended questions the rules cannot cover, like \u201cmy knee is hurting, what can "
     "I take\u201d. Factual questions about your own log are answered on the phone, instantly. If the "
     "AI fails or you are offline, the rules answer instead and the app says so."),
    ("Can the AI say something dangerous?",
     "It only sees the user\u2019s own data and is instructed to answer from that alone. It is never "
     "the source of an interaction warning, and any medicine name it suggests is discarded unless it "
     "matches our own reference."),
    ("Where is the user\u2019s data stored?",
     "In SQLite on the phone, and nowhere else. No account, no analytics, no tracking. The only things "
     "that can leave are an AI question or a caregiver email \u2014 both optional, both labelled."),
    ("What does it cost to run?",
     "Nothing, per user, forever. No servers, no database, no API costs in the default path. The optional "
     "AI and email both use free tiers."),
    ("How does it scale?",
     "There is nothing to scale. Every install is independent \u2014 a million users is a million phones "
     "doing their own work, and our cost stays at zero."),
    ("How would an elderly person use it?",
     "That shaped the design. Big buttons, larger-text mode, voice read-aloud, brand names instead of "
     "chemical names, plain words instead of jargon, and no login at all. Caregiver alerts exist because "
     "realistically a son or daughter helps."),
    ("How do you know it works?",
     "221 automated tests over the logic, plus we drove the real signed APK on a device and checked every "
     "screen. The logs are clean \u2014 no crashes, no errors."),
    ("Why Android and not a website?",
     "A website cannot set an alarm that fires when the phone is locked, cannot work offline reliably, and "
     "cannot read a prescription with the camera. Reminders are the core of the product."),
    ("What makes it different from existing apps?",
     "Reminder apps do not check interactions. Interaction checkers need the internet and are written for "
     "pharmacists. Nobody does both, offline, for the person actually at risk."),
]

LIMITS = [
    "The interaction dataset is hand-built, not certified. It needs pharmacist review before real patients.",
    "Handwriting OCR is unreliable \u2014 so the app shows what it read and asks, rather than guessing.",
    "Some Android manufacturers throttle background alarms unless the app is exempted from battery optimisation.",
    "Cloud assist sends a short summary off the phone. It is optional and clearly labelled.",
    "The demo build ships API keys inside the APK so it works with no setup \u2014 revoke them before sharing widely.",
]


def build_html():
    feats = "".join(
        f'<div class="feat"><div class="ft">{t}</div><div class="fb">{b}</div></div>'
        for t, b in FEATURES)
    stack = "".join(
        f'<tr><td class="k">{k}</td><td>{v}</td></tr>' for k, v in STACK)
    svc = "".join(
        f'<tr><td class="k">{n}</td><td>{u}</td><td class="c">{c}</td></tr>'
        for n, u, c in SERVICES)
    nums = "".join(
        f'<div class="num"><div class="n">{n}</div><div class="l">{l}</div></div>'
        for n, l in NUMBERS)
    demo = "".join(f"<li>{d}</li>" for d in DEMO)
    qa = "".join(
        f'<div class="qa"><div class="q">{q}</div><div class="a">{a}</div></div>'
        for q, a in QA)
    limits = "".join(f"<li>{l}</li>" for l in LIMITS)

    return f"""<!doctype html><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito:wght@400;600;700;800&display=swap');
@page {{ size: A4; margin: 12mm 13mm; }}
*, *::before, *::after {{ box-sizing:border-box; margin:0; padding:0; }}
body {{
  font-family:'Nunito','Segoe UI',system-ui,sans-serif; color:#2D2438;
  font-size:9.4pt; line-height:1.42; -webkit-print-color-adjust:exact; print-color-adjust:exact;
}}
h1 {{ font-family:'DM Serif Display',Georgia,serif; font-size:24pt; font-weight:400; line-height:1.1; }}
h2 {{
  font-family:'DM Serif Display',Georgia,serif; font-size:13.5pt; font-weight:400;
  margin:12pt 0 5pt; padding-bottom:3pt; border-bottom:1.2pt solid #EDE4EC;
}}
h2:first-of-type {{ margin-top:9pt; }}
p {{ margin-bottom:5.5pt; }}
.head {{ display:flex; align-items:center; gap:11pt; margin-bottom:4pt; }}
.tag {{ font-weight:800; font-size:8pt; letter-spacing:.14em; text-transform:uppercase; color:#8B5FBF; }}
.lede {{ font-size:10.4pt; color:#5F5470; margin:6pt 0 2pt; }}
.pill {{
  display:inline-block; background:#F1EBF8; color:#6E45A3; font-weight:800;
  font-size:8pt; padding:3pt 9pt; border-radius:99pt; margin-right:4pt;
}}
.feat {{ margin-bottom:4.5pt; break-inside:avoid; }}
.ft {{ font-weight:800; font-size:9.6pt; }}
.fb {{ color:#5F5470; }}
table {{ width:100%; border-collapse:collapse; }}
td {{ padding:2.8pt 0; border-bottom:.7pt solid #F1EAF0; vertical-align:top; color:#5F5470; }}
td.k {{ font-weight:800; color:#2D2438; width:135pt; padding-right:10pt; }}
td.c {{ text-align:right; white-space:nowrap; color:#3F8F6B; font-weight:700; width:110pt; }}
.nums {{ display:flex; gap:7pt; margin:8pt 0 4pt; }}
.num {{ flex:1; background:#FDEBF1; border-radius:7pt; padding:7pt 9pt; }}
.num .n {{ font-family:'DM Serif Display',Georgia,serif; font-size:15.5pt; color:#C63C68; line-height:1; }}
.num .l {{ font-size:7.6pt; color:#5F5470; font-weight:700; margin-top:2pt; }}
ol, ul {{ padding-left:15pt; }}
li {{ margin-bottom:3.4pt; color:#5F5470; }}
li b {{ color:#2D2438; }}
.qa {{ margin-bottom:6.5pt; break-inside:avoid; }}
.q {{ font-weight:800; font-size:9.6pt; color:#C63C68; }}
.a {{ color:#5F5470; }}
.box {{ background:#FAF1E2; border-radius:8pt; padding:9pt 12pt; margin-top:6pt; }}
.box ul {{ padding-left:13pt; }}
.box li {{ margin-bottom:3.5pt; }}
.note {{ font-size:8.6pt; color:#8C8298; margin-top:12pt; padding-top:7pt; border-top:.7pt solid #EDE4EC; }}
.page {{ break-after:page; }}
.two {{ column-count:2; column-gap:18pt; }}
</style>

<div class="page">
  <div class="head">{FLOWER}<div>
    <div class="tag">Project documentation</div>
    <h1>MediBloom</h1>
  </div></div>
  <p class="lede">An offline-first Android app that checks your medicines for dangerous
  interactions, reminds you when doses are due, and explains the risk in plain language.</p>
  <div style="margin:8pt 0 2pt">
    <span class="pill">Healthtech &amp; Wellness</span>
    <span class="pill">Works offline</span>
    <span class="pill">&#8377;0 to run</span>
    <span class="pill">No account</span>
  </div>

  <h2>The problem</h2>
  <p>Roughly half of all long-term medicine is not taken as prescribed, and taking five or
  more medicines &mdash; normal for an older adult &mdash; roughly doubles the risk of a harmful
  reaction. In India much of that medicine is bought over the counter, so no single doctor or
  pharmacist ever sees the full list.</p>
  <p>Reminder apps tell you <i>when</i> to take something but never whether it is safe.
  Interaction checkers answer that, but they need the internet, are written in clinical English,
  and are built for pharmacists rather than patients. MediBloom does both, offline, in plain words.</p>

  <h2>What it does</h2>
  {feats}

  <h2>How it works</h2>
  <p>Everything that matters runs on the phone. The interaction rules are compiled into the app,
  the data lives in a SQLite database on the device, reminders are handed to Android&rsquo;s alarm
  system, and the OCR runs locally. There is no server anywhere.</p>
  <p>The assistant is split deliberately. Questions that are a direct read of your own data are
  answered by the rule engine &mdash; instant, exact, offline. Only open-ended questions go to an AI
  model, and if that is slow, rate-limited or unreachable, the rules answer instead and the app
  says which one replied.</p>
</div>

<div class="page">
  <h2>Technology used</h2>
  <table>{stack}</table>

  <h2>External services (all optional, all free)</h2>
  <table>{svc}</table>
  <p style="margin-top:6pt; color:#5F5470;">None of these are needed for the app to work.
  With no AI key the assistant answers from its own rules; with no email relay the caregiver
  alert arrives as a notification with the email already written, one tap from sending.</p>

  <h2>Key numbers</h2>
  <div class="nums">{nums}</div>

  <h2>Demo in six steps</h2>
  <ol>{demo}</ol>

  <h2>If something goes wrong on stage</h2>
  <p>If the chat is slow, that is the fallback working &mdash; say so. If a notification does not
  fire, use <b>Settings &rarr; Send a test reminder</b>. If OCR fails on a photo, use
  <b>Try our sample prescription</b>, which runs the identical parser. If nothing works at all,
  open <b>Interactions</b> &mdash; it needs no network, no permissions and no notifications.</p>
</div>

<div>
  <h2>Questions you will be asked</h2>
  <div class="two">{qa}</div>

  <h2>What we would say before being asked</h2>
  <div class="box"><ul>{limits}</ul></div>

  <p class="note">MediBloom provides general medication-safety support. It does not diagnose,
  prescribe, or replace a doctor or pharmacist. In an emergency, contact local emergency services.
  The patients, hospitals and prescriptions used in the demo are fictional.</p>
</div>
"""


def find_chrome():
    for p in CHROME_CANDIDATES:
        if os.path.exists(p):
            return p
    found = shutil.which("chrome") or shutil.which("msedge")
    if found:
        return found
    sys.exit("Could not find Chrome or Edge to render the PDF.")


def main():
    chrome = find_chrome()
    with tempfile.TemporaryDirectory() as tmp:
        page = os.path.join(tmp, "doc.html")
        with open(page, "w", encoding="utf-8") as fh:
            fh.write(build_html())
        subprocess.run(
            [chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
             f"--user-data-dir={os.path.join(tmp, 'prof')}",
             "--virtual-time-budget=6000",
             f"--print-to-pdf={OUT}", "file:///" + page.replace("\\", "/")],
            capture_output=True, timeout=180)

    if not os.path.exists(OUT):
        sys.exit("Chrome produced no PDF.")
    print(f"Saved {OUT}  ({os.path.getsize(OUT):,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
