#!/usr/bin/env python3
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
    Table, TableStyle, NextPageTemplate, Flowable)
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet

NAVY=colors.HexColor('#0B2545'); GOLD=colors.HexColor('#C9A24B')
DARK=colors.HexColor('#11223A'); GREY=colors.HexColor('#6B7990')
LIGHT=colors.HexColor('#F6F8FB'); MID=colors.HexColor('#33455F')
LINE=colors.HexColor('#E2E8F1'); GREEN=colors.HexColor('#1A7F4B')

styles=getSampleStyleSheet()
def S(name,**kw):
    base=kw.pop('parent',styles['Normal']); return ParagraphStyle(name,parent=base,**kw)
body_st  =S('body',fontName='Helvetica',fontSize=10,leading=14,textColor=DARK,spaceAfter=5)
lead_st  =S('lead',fontName='Helvetica',fontSize=10.5,leading=15,textColor=MID,spaceAfter=5)
h2_st    =S('h2',fontName='Helvetica-Bold',fontSize=14,leading=17,textColor=NAVY,spaceBefore=13,spaceAfter=2)
sub_st   =S('sub',fontName='Helvetica-Bold',fontSize=11,leading=14,textColor=colors.HexColor('#1C3559'),spaceBefore=7,spaceAfter=2)
small_st =S('small',fontName='Helvetica-Oblique',fontSize=8,leading=11,textColor=GREY,spaceAfter=6)
bullet_st=S('bullet',fontName='Helvetica',fontSize=10,leading=14,textColor=DARK,leftIndent=12,bulletIndent=2,spaceAfter=2)
cell_st  =S('cell',fontName='Helvetica',fontSize=9,leading=12,textColor=DARK)
cellr_st =S('cellr',parent=cell_st,alignment=TA_RIGHT)
cellc_st =S('cellc',parent=cell_st,alignment=TA_CENTER)
cellh_st =S('cellh',fontName='Helvetica-Bold',fontSize=9,leading=12,textColor=colors.white)
cellhr_st=S('cellhr',parent=cellh_st,alignment=TA_RIGHT)
cellhc_st=S('cellhc',parent=cellh_st,alignment=TA_CENTER)
cellt_st =S('cellt',fontName='Helvetica-Bold',fontSize=9.5,leading=12,textColor=NAVY)
celltr_st=S('celltr',parent=cellt_st,alignment=TA_RIGHT)
celltc_st=S('celltc',parent=cellt_st,alignment=TA_CENTER)

class HR(Flowable):
    def __init__(s,before=2,after=8,color=GOLD,w=1.4): s.b=before;s.a=after;s.c=color;s.w=w;s.width=0;s.height=before+after
    def wrap(s,aw,ah): s.width=aw; return (aw,s.b+s.a)
    def draw(s):
        s.canv.setStrokeColor(s.c); s.canv.setLineWidth(s.w); y=s.a-1; s.canv.line(0,y,s.width,y)
def heading(flow,t): flow.append(Paragraph(t,h2_st)); flow.append(HR())
def bullets(flow,items):
    for it in items: flow.append(Paragraph(it,bullet_st,bulletText='•'))

def ctable(flow,header,rows,widths,num_cols=(),ctr_cols=(),total=False,total_rows=1):
    def mk(c,i,st_r,st_c,st_n):
        return Paragraph(str(c), st_r if i in num_cols else (st_c if i in ctr_cols else st_n))
    data=[[mk(c,i,cellhr_st,cellhc_st,cellh_st) for i,c in enumerate(header)]]
    for r in rows: data.append([mk(c,i,cellr_st,cellc_st,cell_st) for i,c in enumerate(r)])
    t=Table(data,colWidths=[w*mm for w in widths],hAlign='LEFT')
    ts=[('BACKGROUND',(0,0),(-1,0),NAVY),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),
        ('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),
        ('LINEBELOW',(0,0),(-1,-2),0.5,LINE),('VALIGN',(0,0),(-1,-1),'TOP')]
    for ri in range(1,len(data)):
        if ri%2==0: ts.append(('BACKGROUND',(0,ri),(-1,ri),LIGHT))
    if total:
        for k in range(total_rows):
            last=len(data)-1-k
            ts.append(('BACKGROUND',(0,last),(-1,last),GOLD))
            ts.append(('LINEBELOW',(0,last-1),(-1,last-1),0,colors.white))
            for ci in range(len(header)):
                st = celltr_st if ci in num_cols else (celltc_st if ci in ctr_cols else cellt_st)
                data[last][ci]=Paragraph(data[last][ci].text,st)
    t.setStyle(TableStyle(ts)); flow.append(t); flow.append(Spacer(1,4))

def cover_band(canvas,doc):
    canvas.saveState(); w,h=A4
    canvas.setFillColor(NAVY); top=h-16*mm
    canvas.rect(16*mm,top-48*mm,w-32*mm,48*mm,fill=1,stroke=0)
    canvas.setFillColor(GOLD); canvas.setFont('Helvetica-Bold',9)
    canvas.drawString(22*mm,top-9*mm,'OFFICIALLY · INVESTED')
    canvas.setFillColor(colors.white); canvas.setFont('Helvetica-Bold',23)
    canvas.drawString(22*mm,top-19*mm,doc.cover_title)
    canvas.setFillColor(GOLD); canvas.setFont('Helvetica-Bold',12)
    canvas.drawString(22*mm,top-27*mm,doc.cover_sub)
    canvas.setStrokeColor(colors.HexColor('#24395A')); canvas.setLineWidth(0.5)
    canvas.line(22*mm,top-33*mm,w-22*mm,top-33*mm)
    canvas.setFillColor(colors.HexColor('#CDD8E6')); canvas.setFont('Helvetica',7.5)
    canvas.drawString(22*mm,top-39*mm,doc.cover_meta1)
    canvas.drawString(22*mm,top-43.5*mm,doc.cover_meta2)
    foot(canvas,doc); canvas.restoreState()
def plain(canvas,doc): canvas.saveState(); foot(canvas,doc); canvas.restoreState()
def foot(canvas,doc):
    w,h=A4; canvas.setStrokeColor(LINE); canvas.setLineWidth(0.5); canvas.line(16*mm,14*mm,w-16*mm,14*mm)
    canvas.setFillColor(GREY); canvas.setFont('Helvetica-Oblique',7)
    canvas.drawString(16*mm,10*mm,doc.foot_text); canvas.drawRightString(w-16*mm,10*mm,f'Page {doc.page}')

def build(path,title,sub,meta1,meta2,foot_text,story_fn,cover_height=54*mm):
    doc=BaseDocTemplate(path,pagesize=A4,leftMargin=16*mm,rightMargin=16*mm,topMargin=18*mm,bottomMargin=18*mm)
    doc.cover_title=title;doc.cover_sub=sub;doc.cover_meta1=meta1;doc.cover_meta2=meta2;doc.foot_text=foot_text
    w,h=A4
    cf=Frame(16*mm,18*mm,w-32*mm,h-18*mm-16*mm-cover_height,id='cov')
    ff=Frame(16*mm,18*mm,w-32*mm,h-36*mm,id='full')
    doc.addPageTemplates([PageTemplate(id='cover',frames=[cf],onPage=cover_band),
                          PageTemplate(id='plain',frames=[ff],onPage=plain)])
    flow=[NextPageTemplate('plain')]; story_fn(flow); doc.build(flow)

# ================= DOCUMENT =================
def doc(flow):
    flow.append(Spacer(1,4))
    flow.append(Paragraph("Sandeep — thank you for the call. Here is the full plan we agreed, with the exact build, the budget, and an honest projection of the sales it should generate over the first 15 days. The headline: the model is designed so the revenue from the 5-Day Challenge recovers what you put in, while you keep the audience, the trained avatar and the voice as lasting assets.", lead_st))

    heading(flow,'1 · What Changes — The Kumar Method, On Your Own Brand')
    flow.append(Paragraph("We're pausing the separate Anya persona and building around <b>you</b>. The approach is modelled on the Kumar Method — the engineered-virality format behind the “retired accountant” reels that did 35M+ views this month: a real, credible expert, cinematic character-led short videos, a sharp contrarian hook, and structures lifted from posts that have already proven they go viral. We apply that exact playbook to Officially Invested.", body_st))
    bullets(flow,[
        "<b>Your face, made consistent.</b> We train Higgsfield <i>Soul</i> on your images so every video has a clean, consistent on-screen you — without you filming daily.",
        "<b>Your voice, cloned.</b> Retensis AI clones your voice so the narration is unmistakably yours.",
        "<b>Proven structures.</b> We study reels in the business-buying niche that already hit millions of views and rebuild that structure with your message and your deals.",
        "<b>One platform, done properly.</b> We focus entirely on your Instagram (@officially.invested) for now — 2 posts/day — rather than spreading thin."])

    heading(flow,'2 · How The Funnel Turns Views Into Sales')
    flow.append(Paragraph("Every post points to one journey. We don't sell on the feed — we move people into your world and let your existing assets close them:", body_st))
    ctable(flow,['Step','What happens'],
        [['1 · Reel','Cinematic, Kumar-style short on your Instagram — hook in the first second.'],
         ['2 · Landing page','Viewers tap through to the landing page for the free community.'],
         ['3 · Free community (Skool)','They join “Officially Invested: First Deal” — warm, primed, and watching.'],
         ['4 · The video sells','Inside, your video sells the $97 5-Day Deal Challenge.'],
         ['5 · Sale','They buy the $97 Challenge. This is the number the bonus is tied to.']],
        widths=[40,138])
    flow.append(Paragraph("So our job is to fill the top of that funnel with the right people, at volume, cheaply — and the paid boost is what guarantees the volume.", small_st))

    heading(flow,'3 · Milestone 1 — First 15 Days (Delivered)')
    flow.append(Paragraph("The first 15-day block is complete. Please approve the milestone on Upwork so we close it cleanly and move into the new build.", body_st))
    ctable(flow,['Deliverable','Amount'],
        [['First 15 days — delivered (approve on Upwork)','$750.00'],
         ['Milestone 1 total','$750.00']],
        widths=[140,38],num_cols=[1],total=True)

    heading(flow,'4 · Production Budget — What It Costs To Run')
    flow.append(Paragraph("Full transparency before we start. Two parts: the tools that build the content, and the paid boost that distributes it. These are the actual plan prices.", body_st))
    flow.append(Paragraph('A · Monthly tool stack',sub_st))
    ctable(flow,['Tool','Role','Monthly'],
        [['Higgsfield (Soul)','Train + generate your consistent avatar','$139'],
         ['Retensis AI','Clone your voice','$15'],
         ['HeyGen','Turn avatar + voice into talking video','$49'],
         ['Metricool','Schedule + analytics','$53'],
         ['Claude','Scripts, hooks, viral-structure breakdowns','$20'],
         ['CapCut Pro','Editing, captions, end-cards','$10'],
         ['Tool stack subtotal — per month','','$286']],
        widths=[40,108,30],num_cols=[2],total=True)
    flow.append(Paragraph('B · Paid boost — Instagram (15 days)',sub_st))
    ctable(flow,['Item','Detail','Total'],
        [['Posts','2 per day × 15 days = 30 posts','—'],
         ['Boost spend','$30 / day × 15 days','$450'],
         ['Paid boost subtotal','','$450']],
        widths=[40,108,30],num_cols=[2],total=True)
    flow.append(Paragraph('C · Production budget to set off',sub_st))
    ctable(flow,['Component','Amount'],
        [['Tool stack (one month)','$286'],
         ['Instagram paid boost (15 days)','$450'],
         ['Production budget total','$736']],
        widths=[140,38],num_cols=[1],total=True)
    flow.append(Paragraph("This is the running cost of the engine, separate from fees. A small ~$40 buffer for failed renders / platform ad fees is wise but optional. Anything you already pay for, we deduct.", small_st))

    heading(flow,'5 · Management Fee — Billed Weekly')
    flow.append(Paragraph("For running the whole operation — avatar + voice build, viral research, daily scripting and production, scheduling, boost management and reporting — the fee is billed weekly so you only ever pay for the week ahead and can stop any time.", body_st))
    ctable(flow,['Management fee','Amount'],
        [['Per week','$400 / week'],
         ['Across the 15-day cycle (~2 weeks)','$800']],
        widths=[140,38],num_cols=[1],total=True,total_rows=0)
    flow.append(Paragraph("Weekly billing keeps it low-risk for you: you see the numbers each week before funding the next.", small_st))

    heading(flow,'6 · The Sales Target — 50 Sales In 15 Days')
    flow.append(Paragraph("This is what we build the whole engine to hit. It's an honest, bottom-up estimate from the Instagram funnel — not a guarantee — but it's the target the boost spend and the Kumar-style reels are designed to reach.", body_st))
    flow.append(Paragraph('The funnel maths',sub_st))
    ctable(flow,['Stage','Rate','Result (15 days)'],
        [['Landing-page visitors (paid + organic)','—','~2,500'],
         ['Join the free community','25%','~625 members'],
         ['Buy the $97 Challenge (the in-community video)','8%','~50 sales'],
         ['Revenue at $97','','~$4,850']],
        widths=[88,30,60],num_cols=[2],total=True)
    flow.append(Paragraph('How it builds across the two weeks',sub_st))
    ctable(flow,['Week','Focus','Sales','Revenue'],
        [['Week 1','Build avatar + voice, launch, first reels','18','$1,746'],
         ['Week 2','Full cadence, boost behind the winners','32','$3,104'],
         ['15-day total','','50','$4,850']],
        widths=[28,84,30,36],num_cols=[3],ctr_cols=[2],total=True)
    flow.append(Paragraph("Week 1 is lighter because the first days go into training your avatar, cloning your voice and launching — momentum compounds in week 2. And a single reel breaking out (the whole point of the Kumar Method) can push well past 50.", small_st))

    heading(flow,'7 · You Profit — Even After The Bonus')
    flow.append(Paragraph("Here is the part that matters. At the 50-sale target, the Challenge revenue covers every cost of the cycle — including the performance bonus — and still leaves you in clear profit.", body_st))
    ctable(flow,['Your investment (15-day cycle)','Amount'],
        [['Milestone 1 — first 15 days (delivered)','$750'],
         ['Production budget (tools + boost)','$736'],
         ['Management fee (~2 weeks @ $400)','$800'],
         ['Performance bonus (on 40 sales)','$500'],
         ['Total all-in, including the bonus','$2,786']],
        widths=[140,38],num_cols=[1],total=True)
    flow.append(Paragraph('Against projected revenue',sub_st))
    ctable(flow,['','Amount'],
        [['Projected revenue — 50 sales x $97','$4,850'],
         ['Less: total all-in for the cycle (incl. bonus)','- $2,786'],
         ['Your profit on the cycle','$2,064']],
        widths=[140,38],num_cols=[1],total=True)
    bullets(flow,[
        "At the target you clear roughly <b>$2,064 in profit</b> after paying every cost <i>and</i> the $500 bonus.",
        "That's exactly why the bonus makes sense — it only triggers once you're already deep in profit, so it comes out of money you wouldn't have without the work.",
        "And you keep the trained avatar, the cloned voice, the new followers and the community members as assets that keep selling long after the 15 days."])
    flow.append(Paragraph("The $97 sale is only the front door: every Challenge buyer is a warm lead for your higher-ticket coaching and deal work, where the real lifetime value sits.", small_st))

    heading(flow,'8 · Performance Bonus — Tied To Real Sales')
    flow.append(Paragraph("As agreed, the bonus is attached to actual $97 Challenge sales — the outcome we're now driving directly:", body_st))
    ctable(flow,['Trigger','Bonus'],
        [['On the first 40 sales of the $97 Challenge','$500'],
         ['Success-based — only paid once the sales land','$500']],
        widths=[140,38],num_cols=[1],total=True,total_rows=0)
    flow.append(Paragraph("At 40 sales you've already taken ~$3,880 in Challenge revenue, so the bonus is fully self-funding. If you want to push harder, we can raise the target and the boost together.", small_st))

    heading(flow,'9 · To Start — What We Need & How To Pay')
    bullets(flow,[
        "<b>Approve Milestone 1 ($750)</b> on Upwork.",
        "<b>Release the production budget ($736)</b> so we can buy the tools and start the boost. <b>We can only begin once this lands</b> — the avatar training, voice clone and ads all run on it.",
        "<b>Management at $400/week</b>, billed weekly as we go."])
    flow.append(Paragraph('How to send the production budget — your choice:',sub_st))
    optA=Paragraph("<b>Option A — Upwork</b><br/>Keep it all on-platform. Simple and protected for both sides.",body_st)
    optB=Paragraph("<b>Option B — Direct transfer</b><br/>Sent to my account; clears faster so we start sooner.",body_st)
    pay=Table([[optA,optB]],colWidths=[86*mm,86*mm])
    pay.setStyle(TableStyle([('BOX',(0,0),(0,0),0.7,LINE),('BOX',(1,0),(1,0),0.9,GOLD),
        ('BACKGROUND',(1,0),(1,0),colors.HexColor('#FFFDF6')),('VALIGN',(0,0),(-1,-1),'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),10),('RIGHTPADDING',(0,0),(-1,-1),10),
        ('TOPPADDING',(0,0),(-1,-1),9),('BOTTOMPADDING',(0,0),(-1,-1),9)]))
    flow.append(pay)
    flow.append(Paragraph("Whichever you prefer is fine on my end — it only changes how fast we can switch the engine on. Approve the milestone and send the budget, and we start the build the same day.", small_st))

build('/home/user/Jejeola11/strategy-reset-v2/Officially_Invested_Phase2_Plan_and_Budget.pdf',
      'Phase 2 — The Kumar Method Build',
      'Your channel · your avatar & voice · real sales',
      'Prepared for Dr. Sandeep Bansal · 18 June 2026 · Instagram-only launch',
      'Covers: the new build · production budget · management · sales projection · recovery · bonus · how to start',
      'Officially · Invested  |  Phase 2 Plan & Budget  |  18 June 2026. Sales figures are honest estimates from conservative funnel assumptions, not guarantees of results or income.',
      doc)
print('PHASE 2 PDF saved')
