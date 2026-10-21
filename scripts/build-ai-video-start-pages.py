"""Rebuild protected ebook pages 5-7 around a practical first outcome."""
from pathlib import Path
import io
import fitz
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'scripts/ai-video-start-pages.pdf'
ASSETS=ROOT/'server/functions/assets/ai-video-book'
W,H=595.28,841.89
TEAL='#00191B';MUTED='#315456';PAPER='#FFFDF2';LIME='#DFFF4E';YELLOW='#FFE66A'
pdfmetrics.registerFont(TTFont('Fuse','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('FuseBold','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

def wrap(text,width,font='Fuse',size=11.8):
    lines=[];line=''
    for word in text.split():
        next_line=(line+' '+word).strip()
        if line and pdfmetrics.stringWidth(next_line,font,size)>width:
            lines.append(line);line=word
        else:line=next_line
    if line:lines.append(line)
    return lines

def text(c,body,x,y,width=485,size=11.8,leading=18,font='Fuse',color=TEAL):
    c.setFillColor(HexColor(color));c.setFont(font,size)
    for line in wrap(body,width,font,size):c.drawString(x,y,line);y-=leading
    return y

def base(c,n,footer):
    c.setFillColor(HexColor(PAPER));c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(HexColor(TEAL));c.rect(0,H-12,W,12,fill=1,stroke=0)
    c.setFillColor(HexColor(LIME if n%2 else YELLOW));c.rect(0,0,9,H-12,fill=1,stroke=0)
    c.setFillColor(HexColor(MUTED));c.setFont('FuseBold',9);c.drawRightString(W-55,H-55,f'{n:02} / 45')
    c.setStrokeColor(HexColor('#A7C0A4'));c.line(55,50,W-55,50)
    c.setFont('Fuse',8);c.drawString(55,34,'THE NIGERIAN AI VIDEO BUSINESS GUIDE');c.drawRightString(W-55,34,footer)

def title(c,one,two):
    c.setFillColor(HexColor(TEAL));c.setFont('FuseBold',24);c.drawString(55,H-100,one);c.drawString(55,H-133,two)
    return H-178

def card(c,y,label,body,bg='#EAF5D8'):
    lines=wrap(body,449,'Fuse',11.2);height=49+17*len(lines)
    c.setFillColor(HexColor(bg));c.roundRect(55,y-height,485,height,10,fill=1,stroke=0)
    c.setFillColor(HexColor(LIME));c.roundRect(55,y-height,5,height,2,fill=1,stroke=0)
    c.setFillColor(HexColor(TEAL));c.setFont('FuseBold',11);c.drawString(69,y-23,label)
    yy=y-47;c.setFont('Fuse',11.2)
    for line in lines:c.drawString(69,yy,line);yy-=17
    return y-height-18

def section(c,y,label,body):
    c.setFillColor(HexColor(TEAL));c.setFont('FuseBold',12);c.drawString(55,y,label)
    return text(c,body,55,y-26,size=11.3,leading=18)-20

c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)
base(c,5,'START HERE')
y=title(c,'Start here: make something','you can actually show')
y=text(c,'Welcome. You can begin with a phone and no previous AI video work. In this guide, you will make one 20-second practice video, choose an income route, build buyer-relevant proof and plan your next 30 days.',55,y,size=12.4,leading=20)-22
y=card(c,y,'YOUR FIRST WIN','Complete one polished, clearly labelled spec concept. Write a short case study explaining the idea, what you made and the buyer it could help. Start on page 8.')
y=section(c,y,'Then build a business around that skill','Choose who pays you: a client buying video production, a sponsor buying access to your audience, a customer buying your product, or a partner paying commission. Each route requires different proof and a different way to reach buyers.')
y=card(c,y,'WHAT THE TITLE MEANS','First ₦10 million means cumulative gross revenue your creator business might build across many sales. It is a planning target, not a guaranteed result or take-home profit. Costs, fees, revisions and taxes reduce what you keep.','#FFF0CE')
assert y>65,y
c.showPage()

base(c,6,'CHOOSE A ROUTE')
y=title(c,'Four engines. Choose one','to test first.')
y=text(c,'You do not need to master every route. Pick the one that fits the proof, audience and time you have right now. You can explore a second route later.',55,y,size=12.1,leading=19)-18
y=card(c,y,'01 / SERVICE','Brands, founders, agencies or creators pay for a defined video or batch. Begin with a relevant practice concept and a small, clearly scoped paid test.')
y=card(c,y,'02 / AUDIENCE','A sponsor or affiliate partner pays because your original content reaches a specific audience. You need a trustworthy page and clear disclosure of paid relationships.','#FFF0CE')
y=card(c,y,'03 / PRODUCT','Customers buy your original asset, pack, workflow or training. Begin with a specific problem people already ask you to solve, then test a small paid offer.')
y=card(c,y,'04 / MEDIA','Build an original series or character. Revenue can combine sponsors, products, commissions and eligible platform programmes. Audience growth and eligibility take time.','#FFF0CE')
assert y>65,y
c.showPage()

base(c,7,'YOUR FIRST ACTION')
y=title(c,'Your next 48 hours:','one video, one direction.')
y=section(c,y,'If you are completely new','Turn to page 8. Follow the 20-second product brief using a real product photo or a permitted practice asset. You can complete the exercise with a phone and a video editor. Mark the result as a spec concept.')
y=section(c,y,'If you already make videos','Choose your strongest three. For each, write the buyer it could help, the objective, your role, what looks convincing and what you would improve. Pick the most relevant one to refine.')
y=card(c,y,'YOUR ACTION CHECKLIST','1. Finish or select one strong video. 2. Name the buyer and the business problem. 3. Write a four-part case study: brief, approach, deliverable and what it demonstrates. 4. Choose one primary income route for 30 days.')
y=card(c,y,'EVERYTHING YOU NEED TO PRACTICE','The companion resources include 50 briefs sorted by level, DM examples, a permission-based free-sample method and a 30-day plan. Use them in Fuse Atelier as you read. You can make progress without buying another course.','#FFF0CE')
assert y>65,y
c.showPage();c.save()
pdf=fitz.open(OUT)
for i,p in enumerate(pdf,5):
    pix=p.get_pixmap(matrix=fitz.Matrix(2.3,2.3),alpha=False)
    Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB').save(ASSETS/f'{i:02}.webp','WEBP',quality=87,method=6)
print('Updated ebook pages 05-07')
