#!/usr/bin/env python3
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, KeepTogether)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

NAVY = colors.HexColor('#0B2545')
GOLD = colors.HexColor('#C9A24B')
DARK = colors.HexColor('#11223A')
GREY = colors.HexColor('#6B7990')
LIGHT = colors.HexColor('#F6F8FB')
MID = colors.HexColor('#33455F')
LINE = colors.HexColor('#E2E8F1')

styles = getSampleStyleSheet()
def S(name, **kw):
    base = kw.pop('parent', styles['Normal'])
    return ParagraphStyle(name, parent=base, **kw)

body_st   = S('body', fontName='Helvetica', fontSize=10, leading=14, textColor=DARK, spaceAfter=5)
lead_st   = S('lead', fontName='Helvetica', fontSize=10.5, leading=15, textColor=MID, spaceAfter=5)
h2_st     = S('h2', fontName='Helvetica-Bold', fontSize=14, leading=17, textColor=NAVY, spaceBefore=14, spaceAfter=2)
sub_st    = S('sub', fontName='Helvetica-Bold', fontSize=11, leading=14, textColor=colors.HexColor('#1C3559'), spaceBefore=8, spaceAfter=2)
small_st  = S('small', fontName='Helvetica-Oblique', fontSize=8, leading=11, textColor=GREY, spaceAfter=6)
bullet_st = S('bullet', fontName='Helvetica', fontSize=10, leading=14, textColor=DARK, leftIndent=12, bulletIndent=2, spaceAfter=2)
quote_st  = S('quote', fontName='Helvetica-Oblique', fontSize=10, leading=14, textColor=colors.HexColor('#1C3559'),
              leftIndent=10, spaceAfter=6, borderColor=GOLD, borderWidth=0)
cell_st   = S('cell', fontName='Helvetica', fontSize=9, leading=12, textColor=DARK)
cellr_st  = S('cellr', parent=cell_st, alignment=TA_RIGHT)
cellh_st  = S('cellh', fontName='Helvetica-Bold', fontSize=9, leading=12, textColor=colors.white)
cellhr_st = S('cellhr', parent=cellh_st, alignment=TA_RIGHT)
cellt_st  = S('cellt', fontName='Helvetica-Bold', fontSize=9.5, leading=12, textColor=NAVY)
celltr_st = S('celltr', parent=cellt_st, alignment=TA_RIGHT)

def hr(after=8, before=2, color=GOLD, w=1.4):
    from reportlab.platypus import Flowable
    class HR(Flowable):
        def __init__(s): s.width=0; s.height=before+after
        def wrap(s,aw,ah): s.width=aw; return (aw, before+after)
        def draw(s):
            s.canv.setStrokeColor(color); s.canv.setLineWidth(w)
            y=after-1; s.canv.line(0,y,aw if (aw:=s.width) else 0,y)
    return HR()

def heading(flow, text):
    flow.append(Paragraph(text, h2_st))
    flow.append(hr())

def bullets(flow, items):
    for it in items:
        flow.append(Paragraph(it, bullet_st, bulletText='•'))

def quote(flow, text):
    t = Table([[Paragraph(text, quote_st)]], colWidths=[170*mm])
    t.setStyle(TableStyle([
        ('LINEBEFORE',(0,0),(0,-1),2.2,GOLD),
        ('LEFTPADDING',(0,0),(-1,-1),8),('RIGHTPADDING',(0,0),(-1,-1),4),
        ('TOPPADDING',(0,0),(-1,-1),2),('BOTTOMPADDING',(0,0),(-1,-1),2),
    ]))
    flow.append(t); flow.append(Spacer(1,5))

def ctable(flow, header, rows, widths, num_cols=(), total=False):
    data=[]
    data.append([Paragraph(str(c), cellhr_st if i in num_cols else cellh_st) for i,c in enumerate(header)])
    for r in rows:
        data.append([Paragraph(str(c), cellr_st if i in num_cols else cell_st) for i,c in enumerate(r)])
    t = Table(data, colWidths=[w*mm for w in widths], hAlign='LEFT')
    ts = [
        ('BACKGROUND',(0,0),(-1,0),NAVY),
        ('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
        ('LINEBELOW',(0,0),(-1,-2),0.5,LINE),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
    ]
    for ri in range(1,len(data)):
        if ri % 2 == 0:
            ts.append(('BACKGROUND',(0,ri),(-1,ri),LIGHT))
    if total:
        last=len(data)-1
        ts.append(('BACKGROUND',(0,last),(-1,last),GOLD))
        ts.append(('LINEBELOW',(0,last-1),(-1,last-1),0,colors.white))
        for ci in range(len(header)):
            data[last][ci] = Paragraph(data[last][ci].text, celltr_st if ci in num_cols else cellt_st)
    t.setStyle(TableStyle(ts))
    flow.append(t); flow.append(Spacer(1,4))

# ---- page furniture
def cover_band(canvas, doc):
    canvas.saveState()
    w,h = A4
    canvas.setFillColor(NAVY)
    top=h-16*mm
    canvas.rect(16*mm, top-46*mm, w-32*mm, 46*mm, fill=1, stroke=0)
    canvas.setFillColor(GOLD); canvas.setFont('Helvetica-Bold',9)
    canvas.drawString(22*mm, top-9*mm, 'OFFICIALLY · INVESTED — ANYA MEHRA')
    canvas.setFillColor(colors.white); canvas.setFont('Helvetica-Bold',26)
    canvas.drawString(22*mm, top-20*mm, doc.cover_title)
    canvas.setFillColor(GOLD); canvas.setFont('Helvetica-Bold',12)
    canvas.drawString(22*mm, top-28*mm, doc.cover_sub)
    canvas.setStrokeColor(colors.HexColor('#24395A')); canvas.setLineWidth(0.5)
    canvas.line(22*mm, top-33*mm, w-22*mm, top-33*mm)
    canvas.setFillColor(colors.HexColor('#CDD8E6')); canvas.setFont('Helvetica',7.5)
    canvas.drawString(22*mm, top-39*mm, doc.cover_meta)
    foot(canvas, doc)
    canvas.restoreState()

def plain(canvas, doc):
    canvas.saveState(); foot(canvas, doc); canvas.restoreState()

def foot(canvas, doc):
    w,h=A4
    canvas.setStrokeColor(LINE); canvas.setLineWidth(0.5)
    canvas.line(16*mm,14*mm,w-16*mm,14*mm)
    canvas.setFillColor(GREY); canvas.setFont('Helvetica-Oblique',7)
    canvas.drawString(16*mm,10*mm, doc.foot_text)
    canvas.drawRightString(w-16*mm,10*mm, f'Page {doc.page}')

def build(path, title, sub, meta, foot_text, story_fn, cover_height=52*mm):
    doc = BaseDocTemplate(path, pagesize=A4,
        leftMargin=16*mm, rightMargin=16*mm, topMargin=18*mm, bottomMargin=18*mm)
    doc.cover_title=title; doc.cover_sub=sub; doc.cover_meta=meta; doc.foot_text=foot_text
    w,h=A4
    cover_frame = Frame(16*mm, 18*mm, w-32*mm, h-18*mm-16*mm-cover_height, id='cov')
    full_frame  = Frame(16*mm, 18*mm, w-32*mm, h-36*mm, id='full')
    doc.addPageTemplates([
        PageTemplate(id='cover', frames=[cover_frame], onPage=cover_band),
        PageTemplate(id='plain', frames=[full_frame], onPage=plain),
    ])
    from reportlab.platypus import NextPageTemplate
    flow=[]
    story_fn(flow)
    # force switch to plain after first frame fills — insert template switch at start
    flow2=[NextPageTemplate('plain')]+flow
    doc.build(flow2)

# ============ CLIENT PROPOSAL ============
def proposal(flow):
    flow.append(Spacer(1,4))
    flow.append(Paragraph("The first 15 days are delivered and the system is built. They didn't break through on reach — so this document does two things: it closes out the completed milestone, and lays out a sharper, evidence-led engine for the next cycle, with a clear, fixed investment so we both know exactly what we're putting in before we set off.", lead_st))

    heading(flow,'1 · Milestone 1 — First 15 Days (Delivered)')
    flow.append(Paragraph("The first 15-day content block — scripts, AI avatar production, platform-ready edits and scheduling across Instagram, TikTok and YouTube — is complete and delivered. This is contracted, finished work and is independent of the new direction below.", body_st))
    ctable(flow, ['Deliverable','Amount'],
        [['First 15 days — full content block, produced & published (completed)','$750.00'],
         ['Release to close Milestone 1','$750.00']],
        widths=[140,38], num_cols=[1], total=True)
    flow.append(Paragraph("Recommended action: release Milestone 1 today. The new cycle starts on a clean slate once this is settled.", small_st))

    heading(flow,"2 · Why Month One Didn't Break Through")
    flow.append(Paragraph("An honest read — so the fix is targeted, not guesswork:", body_st))
    bullets(flow,[
        "<b>The hook lost the first 3 seconds.</b> Static opens get scrolled past before the message lands.",
        "<b>We led with polish, not friction.</b> The feed rewards a sharp, contrarian opening line, not a calm intro.",
        "<b>No proven structure underneath the posts.</b> Good content, but not shaped like what already wins in this niche.",
        "<b>No paid reach.</b> Organic-only on cold accounts barely distributes. Nothing was filling the funnel."])

    heading(flow,'3 · The New Direction — Model What Wins, Then Put Spend Behind It')
    flow.append(Paragraph('Step 1 — Reverse-engineer proven winners', sub_st))
    flow.append(Paragraph('We study posts in the business-acquisition / “boring wealth” niche that have already done millions of views, and break down the structure that made them work — hook, pacing, on-screen text, the emotional turn, the call to action. We model that proven structure, then write original Anya content into it. The framework is borrowed; the script, voice and brand stay 100% ours.', body_st))
    flow.append(Paragraph('Step 2 — Build for all three platforms', sub_st))
    flow.append(Paragraph('Each idea is produced as native content for YouTube, Instagram and TikTok — correct format, length and end-card per platform — using the AI avatar + motion stack. One proven structure becomes three platform-native assets: more surface area for the same production effort.', body_st))
    flow.append(Paragraph('Step 3 — Paid boost: the reach lever (7-day push)', sub_st))
    flow.append(Paragraph('Once a post is live and performing, we put paid spend behind the best ones for a full week across all three platforms. This is what gets Anya in front of large, cold audiences fast — the difference between a good post nobody sees and a good post that compounds followers and signups. Organic earns the right; paid pours fuel on it.', body_st))

    heading(flow,'4 · Production & Ad Budget — Everything It Takes To Run One Cycle')
    flow.append(Paragraph("Full transparency on what the engine costs before we start. Two parts: the monthly tool stack that produces the content, and the one-week paid push that distributes it.", body_st))
    flow.append(Paragraph('A · Monthly tool stack (production)', sub_st))
    ctable(flow, ['Tool','What it does','Plan','Monthly'],
        [['HeyGen','AI avatar video + Seedance motion (the talking, moving Anya)','Pro / Scale','$99'],
         ['Higgsfield','Cinematic B-roll & motion shots for the first 3 seconds','Ultimate','$49'],
         ['Claude','Scripts, contrarian hooks, captions, structure breakdowns','Pro','$20'],
         ['Metricool','Scheduling + analytics across all 3 platforms','Advanced','$22'],
         ['ElevenLabs','Voiceover / narration','Creator','$22'],
         ['CapCut Pro','Editing, captions, end-cards','Pro','$10'],
         ['Canva Pro','Carousels, covers, thumbnails','Pro','$13'],
         ['Tool stack subtotal — per month','','','$235']],
        widths=[26,86,28,24], num_cols=[3], total=True)
    flow.append(Paragraph('B · Paid boost (7-day push across 3 platforms)', sub_st))
    ctable(flow, ['Platform','Format boosted','Per day','Days','Total'],
        [['Instagram','Reels + carousels','$30','7','$210'],
         ['TikTok','Spark Ads / Promote','$30','7','$210'],
         ['YouTube','Shorts / in-feed','$25','7','$175'],
         ['Paid boost subtotal — recommended (Standard) tier','','','','$595']],
        widths=[28,70,22,16,24], num_cols=[2,3,4], total=True)
    flow.append(Paragraph("Boost is adjustable:  Lean ≈ $315/week (~$15/day each)  ·  Standard (recommended) ≈ $595/week  ·  Aggressive ≈ $1,050/week (~$50/day each). Standard is the level that reliably moves follower and signup numbers in a 7-day window.", small_st))
    flow.append(Paragraph('C · One-cycle total', sub_st))
    ctable(flow, ['Component','Amount'],
        [['Monthly tool stack (production)','$235'],
         ['Paid boost — 7-day push (Standard)','$595'],
         ['Contingency buffer (~10% — failed renders, platform ad fees, re-exports)','$85'],
         ['Production & ad budget — one cycle','$915']],
        widths=[140,38], num_cols=[1], total=True)
    flow.append(Paragraph("This is the project's running cost, separate from the Milestone 1 release. Any tools already owned can be deducted directly.", small_st))

    heading(flow,'5 · Restructured Performance Bonus — Tied To What We Control')
    flow.append(Paragraph("The original bonus — $500 for the first 40 paid signups — rewards an outcome that sits past our handoff. Whether a warm lead converts to a paid challenge depends on the sales page, the price and the follow-up — none of which we run. So we're proposing to re-tie the same reward to the metric we do own and drive directly:", body_st))
    flow.append(Paragraph('New bonus: paid on free-community signups', sub_st))
    ctable(flow, ['Structure','Rate','Target','Bonus'],
        [['Per verified member into the free community','$5 / signup','100 members','$500'],
         ['Same budget as before — now tied to a number we can move','','','$500']],
        widths=[86,30,32,24], num_cols=[2,3], total=True)
    flow.append(Paragraph("Why this is better for you: getting people into the free community is exactly the job our content does — so the incentive lines up with the work, and it builds you an owned audience you keep marketing to for free. It's fully measurable, fully attributable, and scalable on your call: if you want more momentum, we lift the target (e.g. 250 members → $1,000) at the same per-signup rate.", body_st))

    heading(flow,'6 · The 10-Day Test & Decision')
    flow.append(Paragraph("We run the new engine on 10 scripts over 10 days, with the 7-day paid push behind the best performers. At the end we read the numbers together — reach, follower growth, and free-community signups — and decide whether to scale, adjust, or stop. No open-ended commitment; a clear checkpoint.", body_st))

    heading(flow,"7 · What We're Asking For Today & How To Fund It")
    flow.append(Paragraph('Your fee for this phase', sub_st))
    flow.append(Paragraph("The first 15 days were billed at the original content rate — $750, half of the $1,500/month engagement. This next 15-day phase is $1,000: the scope expands from producing content to running a managed campaign — viral-structure research and hands-on management of the paid boost across all three platforms — which the first block didn't include.", body_st))
    ctable(flow, ['#','Item','Amount'],
        [['1','Milestone 1 — first 15 days, delivered (close-out)','$750'],
         ['2','Management fee — next 15-day phase (research + managed paid campaign)','$1,000'],
         ['3','Production & ad budget — one cycle (tools + 7-day boost)','$915'],
         ['4','Performance bonus — paid on free-community signups (on results)','$500']],
        widths=[10,130,38], num_cols=[2])
    flow.append(Paragraph("Item 4 is paid only on delivered signups. Items 1–3 are what we need to close out and set off.", small_st))
    flow.append(Paragraph('Two ways to pay', sub_st))
    optA = Paragraph("<b>Option A — Release via milestone</b><br/>✓ Funds settle in ~7 days<br/>✓ Stays inside the platform's protection for both sides<br/><br/><font size=8 color='#6B7990'>Best if you'd rather keep everything on the existing milestone rails.</font>", body_st)
    optB = Paragraph("<b>Option B — Direct transfer (fastest)</b><br/>✓ Sent to my personal US account<br/>✓ Clears in ~2 days — we start almost immediately<br/><br/><font size=8 color='#6B7990'>Best if you want the new cycle moving this week. Off-platform, so it's a direct trust arrangement between us.</font>", body_st)
    pay = Table([[optA, optB]], colWidths=[86*mm, 86*mm])
    pay.setStyle(TableStyle([
        ('BOX',(0,0),(0,0),0.7,LINE),('BOX',(1,0),(1,0),0.9,GOLD),
        ('BACKGROUND',(1,0),(1,0),colors.HexColor('#FFFDF6')),
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),10),
    ]))
    flow.append(pay)
    flow.append(Paragraph("Either route works on my end — it's purely a question of how fast you want the next cycle to start.", small_st))

build('/home/user/Jejeola11/strategy-reset-v2/Officially_Invested_Strategy_Reset_v2_Client_Proposal.pdf',
      'Strategy Reset v2',
      'New direction · the investment · the milestone close-out',
      'Prepared for the client call · 17 June 2026 · Milestone 1 · content engine · budget · bonus · payment',
      'Officially · Invested — Anya Mehra  |  Strategy Reset v2  |  Prepared 17 June 2026. Figures are estimates for one cycle, adjustable on the call. No results guaranteed.',
      proposal)
print('PROPOSAL PDF saved')

# ============ RUN-SHEET ============
def runsheet(flow):
    flow.append(Spacer(1,4))
    flow.append(Paragraph("<b>Goal of the call:</b> (1) release the $750 milestone, (2) sign-off on the new direction, (3) agree the $1,000 fee for the next phase, (4) lock the production budget, (5) swap the bonus to free-community signups, (6) agree how they pay. Tone: calm and confident — you delivered the work. This is a better plan, not an apology.", lead_st))

    heading(flow,'0 · Open (30 seconds)')
    quote(flow,'“Thanks for making time. The first 15 days are built and delivered. They didn’t break through on reach — and I’ve got a clear, honest read on why, plus a sharper plan that fixes it. I’ll walk you through the new direction, exactly what it costs to run, and a cleaner way to structure the bonus.”')
    flow.append(Paragraph('Share the proposal document.', body_st))

    heading(flow,'1 · Close out Milestone 1 — $750 (do this first)')
    bullets(flow,[
        "The first 15 days are complete, contracted work — independent of whatever we decide next.",
        "Ask plainly: <b>“Can we release the $750 for the first block today so we start the next cycle clean?”</b>",
        "If they hesitate on results: that milestone is for production & delivery, which is done. The reach problem is exactly what the new plan solves — and they're not funding that blindly; the whole budget is laid out."])

    heading(flow,'2 · Why it underperformed (60 seconds, matter-of-fact)')
    bullets(flow,[
        "Hook lost the first 3 seconds (static opens).",
        "Led with polish, not a contrarian opening line.",
        "No proven structure under the posts.",
        "No paid reach — organic-only on cold accounts barely distributes."])
    quote(flow,'“None of these are fatal. They’re all fixable, and the fix is the new direction.”')

    heading(flow,'3 · The new direction (core pitch)')
    bullets(flow,[
        "<b>Model what already wins:</b> find niche posts doing millions of views, break down the structure, write original Anya content into that proven shape.",
        "<b>If he worries about copying:</b> “We borrow the structure, not the content. Script, voice and brand stay 100% ours. Every top creator works this way.”",
        "<b>Three platforms native:</b> one structure → YouTube + Instagram + TikTok.",
        "<b>Paid boost, 7-day push:</b> “This is the lever that was missing. The difference between a good post nobody sees and one that compounds.”"])

    heading(flow,'4 · Your fee for this phase — $1,000')
    bullets(flow,[
        "<b>Frame the jump from $750:</b> “The first block was the old content-only rate — $750, half of the $1,500/month. This phase is $1,000 because it’s no longer just content: it includes the viral research and running the paid campaign across all three platforms.”",
        "<b>Keep it separate from the ad/tool budget.</b> The $1,000 is your labour; the $915 is the engine’s running cost (mostly his ad spend). Don’t let them blur."])

    heading(flow,'4b · The budget (lead with the total)')
    bullets(flow,[
        "<b>Tool stack: $235/mo</b> — HeyGen, Higgsfield, Claude, Metricool, ElevenLabs, CapCut, Canva.",
        "<b>Paid boost: $595</b> for a 7-day push (Standard; Lean ~$315 / Aggressive ~$1,050).",
        "<b>+10% buffer → one-cycle total ≈ $915.</b> Anything he already pays for, we deduct."])

    heading(flow,'5 · Restructure the bonus (your key ask)')
    quote(flow,'“The old bonus was $500 for the first 40 paid signups. Problem: whether a lead converts to paid depends on the sales page, price and follow-up — things I don’t control. So I’d be paid on something outside my hands.”')
    quote(flow,'“What I do control is getting people into the free community. So I want to tie the same $500 to that — $5 per verified member, target 100. Same budget, tied to a number I can move — and it builds you an owned audience you keep marketing to for free.”')
    bullets(flow,[
        "<b>Scalable hook:</b> “Want more momentum? Raise the target at the same rate — 250 members for $1,000. You decide the dial.”",
        "<b>If he pushes on rate:</b> $5/signup is the anchor. Flex the target up, not the rate down."])

    heading(flow,'6 · The test & decision (lowers his risk)')
    quote(flow,'“We run 10 scripts over 10 days with the paid push behind the best ones, then read the numbers together — reach, followers, free signups — and decide to scale, adjust, or stop. No open-ended commitment.”')

    heading(flow,'7 · Payment — give him the choice')
    bullets(flow,[
        "<b>Option A — milestone release:</b> settles in ~7 days, stays on-platform.",
        "<b>Option B — direct to your US account:</b> clears in ~2 days, faster start."])
    quote(flow,'“Either works for me. It’s just how fast you want the next cycle moving — if you want it live this week, the direct route is quicker.”')

    heading(flow,'Numbers cheat-sheet (memorise these)')
    ctable(flow, ['Item','Number'],
        [['Milestone 1 (release now)','$750'],
         ['Management fee — next 15-day phase','$1,000'],
         ['Tool stack / month','$235'],
         ['Paid boost (7-day, Standard)','$595'],
         ['One-cycle budget (incl. buffer)','~$915'],
         ['Bonus rate','$5 / free signup'],
         ['Bonus target / payout','100 → $500'],
         ['Scale option','250 → $1,000'],
         ['Pay: milestone','~7 days'],
         ['Pay: direct US account','~2 days']],
        widths=[96,60], num_cols=[1])

    heading(flow,'Likely objections → your answer')
    obj=[
     ("“Why pay $750 if it didn’t go viral?”","It’s for delivered production, not a virality guarantee. Reach is what the new plan fixes — fully budgeted, your call to fund."),
     ("“Why is the next phase $1,000, not $750?”","The first block was content-only at the old rate. This phase adds viral research and managed paid advertising across 3 platforms — more hands-on work. Still below the original $1,500/month run rate."),
     ("“Isn’t copying viral posts risky/unoriginal?”","We model structure, not content. Standard practice for every serious creator. Brand stays ours."),
     ("“Why pay for free signups, not sales?”","That’s the part I control and can guarantee effort against. Sales depend on your funnel. You also keep the audience."),
     ("“$915 is a lot.”","Most of it is your ad spend going to your reach, plus tools you keep. We can run the Lean tier (~$315 boost) to start smaller."),
     ("“Can we skip paid boost?”","That’s the exact thing missing in month one. Without it we’d repeat what didn’t work."),
    ]
    for q,a in obj:
        flow.append(Paragraph(f"<b><font color='#0B2545'>{q}</font></b>  → {a}", bullet_st, bulletText='•'))

    heading(flow,'After the call — confirm in writing')
    flow.append(Paragraph("Send a 4-line recap: milestone released (Y/N + method) · budget approved (tier) · bonus terms ($5/signup, target) · start date.", body_st))

build('/home/user/Jejeola11/strategy-reset-v2/Strategy_Reset_v2_Call_Run_Sheet.pdf',
      'Call Run-Sheet — v2',
      'Internal · your talking script for the call',
      'Strategy Reset v2 · for you only · 17 June 2026',
      'Strategy Reset v2 — Internal Call Run-Sheet  |  For your use only.',
      runsheet)
print('RUN-SHEET PDF saved')
