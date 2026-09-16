"""
Builds the demo prescriptions: HTML, PDF and PNG for each.

Every one is fictional and watermarked. The hospitals, doctors, registration
numbers and patients do not exist. The medicines and the way they are written
are real, and deliberately weighted towards what women and older adults are
actually prescribed in south India — because that is who this app is for, and
a demo that reads like a textbook convinces nobody.

    python scripts/generate-prescriptions.py
"""

import os
import shutil
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "demo-prescriptions")

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

# slug, accent colour, hospital, dept/address, phone, doctor, quals, reg,
# patient, age/sex, date, opd, diagnosis, rows, advice
PRESCRIPTIONS = [
    dict(
        slug="rx1-anna-nagar-cardiac",
        accent="#0B5C8A",
        hospital="Anna Nagar Heart &amp; Diabetes Centre",
        dept="Department of Cardiology &middot; 42 Second Avenue, Anna Nagar, Chennai 600040",
        phone="Ph: 044-2620-4488 &middot; opd@annanagarheart-demo.example",
        doctor="Dr. Meenakshi Raghavan",
        quals="MD, DM (Cardiology)",
        reg="Reg. No. DEMO-TN-44821",
        patient="Lakshmi Subramanian",
        agesex="68 / F",
        date="16 September 2026",
        opd="ANH-22841",
        diagnosis="Post mitral valve replacement, on anticoagulation &middot; Type 2 diabetes &middot; Hypothyroidism",
        rows=[
            ("Tab. Warfarin", "5 mg", "Once daily &mdash; 8 pm", "Continue"),
            ("Tab. Thyronorm", "50 mcg", "Once daily &mdash; empty stomach", "Continue"),
            ("Tab. Glycomet", "500 mg", "Twice daily &mdash; after food", "Continue"),
            ("Tab. Shelcal", "500 mg", "Once daily &mdash; after lunch", "3 months"),
            ("Cap. Nurokind", "1500 mcg", "Once daily &mdash; morning", "3 months"),
            ("Tab. Atorvastatin", "10 mg", "Once daily &mdash; night", "Continue"),
        ],
        advice=[
            "Warfarin at the same time every night. Do not skip.",
            "Thyronorm one hour before coffee or breakfast.",
            "<b>Do not take Meftal, Combiflam or any pain tablet from the medical shop without asking us first.</b>",
            "INR check every month. Report any unusual bruising or bleeding at once.",
        ],
    ),
    dict(
        slug="rx2-kongu-womens-health",
        accent="#8B2F62",
        hospital="Kongu Women&rsquo;s Clinic",
        dept="Obstetrics &amp; Gynaecology &middot; 18 Mettupalayam Road, Coimbatore 641043",
        phone="Ph: 0422-233-9910 &middot; care@konguwomens-demo.example",
        doctor="Dr. Anitha Selvaraj",
        quals="MBBS, MS (Obstetrics &amp; Gynaecology)",
        reg="Reg. No. DEMO-TN-31556",
        patient="Divya Ramesh",
        agesex="34 / F",
        date="16 September 2026",
        opd="KWC-7734",
        diagnosis="Heavy menstrual bleeding &middot; Iron deficiency anaemia (Hb 9.1)",
        rows=[
            ("Tab. Trapic MF", "500 mg", "Thrice daily &mdash; during periods", "5 days"),
            ("Tab. Meftal Spas", "250 mg", "As needed for cramps", "SOS"),
            ("Tab. Livogen", "100 mg", "Once daily &mdash; after lunch", "3 months"),
            ("Tab. Folvite", "5 mg", "Once daily &mdash; morning", "3 months"),
        ],
        advice=[
            "Take iron with lemon juice or orange, not with tea, coffee or milk.",
            "Iron and calcium must be at least four hours apart.",
            "Repeat haemoglobin after 8 weeks.",
            "Return sooner if bleeding soaks more than one pad an hour.",
        ],
    ),
    dict(
        slug="rx3-meenakshi-bone-clinic",
        accent="#1F6B4A",
        hospital="Meenakshi Bone &amp; Joint Clinic",
        dept="Orthopaedics &middot; 7 West Masi Street, Madurai 625001",
        phone="Ph: 0452-234-7781 &middot; frontdesk@meenakshibone-demo.example",
        doctor="Dr. Bhuvaneswari Karthik",
        quals="MBBS, MS (Orthopaedics)",
        reg="Reg. No. DEMO-TN-28114",
        patient="Kamala Venkatesan",
        agesex="72 / F",
        date="16 September 2026",
        opd="MBJ-4419",
        diagnosis="Post-menopausal osteoporosis (T-score -2.9) &middot; Vitamin D deficiency &middot; Acid reflux",
        rows=[
            ("Tab. Osteofos", "70 mg", "Once weekly &mdash; Sunday morning", "6 months"),
            ("Tab. Shelcal XT", "500 mg", "Once daily &mdash; after lunch", "6 months"),
            ("Sachet Calcirol", "60000 IU", "Once weekly &mdash; Sunday", "8 weeks"),
            ("Tab. Pan 40", "40 mg", "Once daily &mdash; before breakfast", "1 month"),
        ],
        advice=[
            "<b>Osteofos first thing, empty stomach, full glass of plain water.</b>",
            "Stay sitting or standing for 30 minutes after it. No calcium, no food, no tea in that time.",
            "Calcium after lunch only &mdash; never together with the bone tablet.",
            "Walk 20 minutes daily. Repeat DEXA scan after one year.",
        ],
    ),
    dict(
        slug="rx4-brindavan-general",
        accent="#7A4B16",
        hospital="Brindavan Multispeciality Hospital",
        dept="General Medicine &middot; 90 Sarjapur Main Road, Bengaluru 560102",
        phone="Ph: 080-4000-1122 &middot; gm-opd@brindavan-demo.example",
        doctor="Dr. Rajiv Menon",
        quals="MBBS, MD (General Medicine)",
        reg="Reg. No. DEMO-KA-51902",
        patient="Saroja Nair",
        agesex="61 / F",
        date="16 September 2026",
        opd="BMH-11267",
        diagnosis="Type 2 diabetes mellitus &middot; Hypertension &middot; Dyslipidaemia &middot; Hypothyroidism",
        rows=[
            ("Tab. Glycomet GP", "500 mg", "Twice daily &mdash; before food", "Continue"),
            ("Tab. Telma", "40 mg", "Once daily &mdash; morning", "Continue"),
            ("Tab. Storvas", "10 mg", "Once daily &mdash; night", "Continue"),
            ("Tab. Ecosprin", "75 mg", "Once daily &mdash; after lunch", "Continue"),
            ("Tab. Thyronorm", "75 mcg", "Once daily &mdash; empty stomach", "Continue"),
        ],
        advice=[
            "Thyronorm first thing, then wait one hour before coffee or tablets.",
            "Check fasting sugar twice a week and write it down.",
            "Lipid profile and TSH in three months.",
            "Tell us before starting any painkiller from outside.",
        ],
    ),
    dict(
        slug="rx5-simple-clean",
        accent="#3B3B6B",
        hospital="Sri Lakshmi Family Clinic",
        dept="Family Medicine &middot; 22 Bazaar Street, Thanjavur 613001",
        phone="Ph: 04362-23-1180",
        doctor="Dr. S. Thirumalai",
        quals="MBBS",
        reg="Reg. No. DEMO-TN-19004",
        patient="Rukmini Iyer",
        agesex="66 / F",
        date="16 September 2026",
        opd="SLF-882",
        diagnosis="Seasonal allergic rhinitis &middot; Acidity",
        rows=[
            ("Tab. Montek LC", "10 mg", "Once daily &mdash; night", "10 days"),
            ("Tab. Pan 40", "40 mg", "Once daily &mdash; before breakfast", "10 days"),
            ("Tab. Dolo 650", "650 mg", "If fever or body pain", "SOS"),
        ],
        advice=[
            "Steam inhalation twice a day.",
            "Return if the cough lasts more than a week.",
        ],
    ),
]

TEMPLATE = """<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  @page {{ size: 8.27in 11.69in; margin: 0; }}
  * {{ box-sizing: border-box; }}
  body {{ margin:0; font-family: 'Segoe UI', Arial, sans-serif; color:#1a1a1a; }}
  .page {{ width:794px; height:1123px; padding:48px 56px; position:relative; }}
  .hdr {{ border-bottom:3px solid {accent}; padding-bottom:16px; display:flex;
          justify-content:space-between; align-items:flex-start; }}
  .hosp {{ font-size:25px; font-weight:700; color:{accent}; letter-spacing:-0.3px; }}
  .sub {{ font-size:12px; color:#555; margin-top:4px; }}
  .doc {{ text-align:right; font-size:12.5px; line-height:1.6; }}
  .docname {{ font-size:15px; font-weight:700; color:#1a1a1a; }}
  .meta {{ display:flex; gap:36px; margin:26px 0 8px 0; font-size:13px; flex-wrap:wrap; }}
  .meta div span {{ color:#666; }}
  .rxsym {{ font-size:40px; font-weight:700; color:{accent}; font-family:Georgia,serif;
            margin:18px 0 6px 0; }}
  table {{ width:100%; border-collapse:collapse; font-size:13.5px; }}
  th {{ background:{tint}; text-align:left; padding:10px 12px; font-size:12px;
        color:{accent}; border:1px solid #CBDDE8; }}
  td {{ padding:11px 12px; border:1px solid #DFE7EC; }}
  .notes {{ margin-top:26px; font-size:13px; line-height:1.75; }}
  .notes b {{ color:{accent}; }}
  .sign {{ position:absolute; bottom:120px; right:56px; text-align:center; }}
  .signline {{ width:190px; border-top:1px solid #333; margin-top:44px; padding-top:6px;
               font-size:12px; }}
  .foot {{ position:absolute; bottom:40px; left:56px; right:56px; border-top:1px solid #ddd;
           padding-top:12px; font-size:10.5px; color:#888; display:flex;
           justify-content:space-between; }}
  .demo {{ position:absolute; top:50%; left:50%; transform:translate(-50%,-50%) rotate(-24deg);
           font-size:62px; font-weight:800; color:rgba(200,30,30,0.07); letter-spacing:4px;
           white-space:nowrap; pointer-events:none; }}
</style>
</head>
<body>
<div class="page">
  <div class="demo">SAMPLE &middot; DEMO ONLY</div>

  <div class="hdr">
    <div>
      <div class="hosp">{hospital}</div>
      <div class="sub">{dept}</div>
      <div class="sub">{phone}</div>
    </div>
    <div class="doc">
      <div class="docname">{doctor}</div>
      <div>{quals}</div>
      <div>{reg}</div>
    </div>
  </div>

  <div class="meta">
    <div><span>Patient:</span> <b>{patient}</b></div>
    <div><span>Age/Sex:</span> <b>{agesex}</b></div>
    <div><span>Date:</span> <b>{date}</b></div>
    <div><span>OPD No:</span> <b>{opd}</b></div>
  </div>
  <div style="font-size:13px; margin-bottom:6px;">
    <span style="color:#666;">Diagnosis:</span> <b>{diagnosis}</b>
  </div>

  <div class="rxsym">&#8478;</div>

  <table>
    <tr>
      <th style="width:38%">Medicine</th><th style="width:16%">Strength</th>
      <th style="width:26%">Frequency</th><th style="width:20%">Duration</th>
    </tr>
    {rows}
  </table>

  <div class="notes"><b>Advice:</b><br>{advice}</div>

  <div class="sign">
    <div class="signline">{doctor}</div>
  </div>

  <div class="foot">
    <div>NOT A REAL MEDICAL DOCUMENT &middot; generated for a software demo</div>
    <div>{opd}</div>
  </div>
</div>
</body>
</html>
"""


def tint(accent):
    """A very light wash of the accent colour for the table header."""
    r, g, b = (int(accent[i:i + 2], 16) for i in (1, 3, 5))
    mix = lambda v: int(v + (255 - v) * 0.90)
    return f"#{mix(r):02X}{mix(g):02X}{mix(b):02X}"


def build_html(p):
    rows = "\n    ".join(
        f"<tr><td>{a}</td><td>{b}</td><td>{c}</td><td>{d}</td></tr>"
        for a, b, c, d in p["rows"]
    )
    advice = "<br>".join(f"&bull; {line}" for line in p["advice"])
    return TEMPLATE.format(tint=tint(p["accent"]), rows=rows, advice=advice, **{
        k: v for k, v in p.items() if k not in ("rows", "advice", "slug")
    })


def find_chrome():
    for path in CHROME_CANDIDATES:
        if os.path.exists(path):
            return path
    found = shutil.which("chrome") or shutil.which("msedge")
    if found:
        return found
    sys.exit("Could not find Chrome or Edge to render the prescriptions.")


def render(chrome, html_path, slug):
    pdf_path = os.path.join(OUT, f"{slug}.pdf")
    png_path = os.path.join(OUT, f"{slug}.png")
    url = "file:///" + html_path.replace("\\", "/")

    with tempfile.TemporaryDirectory() as profile:
        base = [chrome, "--headless=new", "--disable-gpu", "--hide-scrollbars",
                f"--user-data-dir={profile}"]
        subprocess.run(base + [f"--print-to-pdf={pdf_path}", "--no-pdf-header-footer", url],
                       capture_output=True, timeout=180)
        subprocess.run(base + [f"--screenshot={png_path}", "--window-size=794,1123",
                               "--force-device-scale-factor=2", url],
                       capture_output=True, timeout=180)

    ok_pdf = os.path.exists(pdf_path)
    ok_png = os.path.exists(png_path)
    print(f"  {slug:32} pdf={'ok' if ok_pdf else 'FAILED':6} png={'ok' if ok_png else 'FAILED'}")
    return ok_pdf and ok_png


def main():
    chrome = find_chrome()
    os.makedirs(OUT, exist_ok=True)

    # Clear the previous set so renamed files do not linger.
    for name in os.listdir(OUT):
        if name.startswith("rx") and name.split(".")[-1] in ("html", "pdf", "png"):
            os.remove(os.path.join(OUT, name))

    print(f"Rendering with: {chrome}")
    all_ok = True
    for p in PRESCRIPTIONS:
        html_path = os.path.join(OUT, f"{p['slug']}.html")
        with open(html_path, "w", encoding="utf-8") as fh:
            fh.write(build_html(p))
        all_ok &= render(chrome, html_path, p["slug"])

    print("Done." if all_ok else "Some files failed to render.")
    sys.exit(0 if all_ok else 1)


if __name__ == "__main__":
    main()
