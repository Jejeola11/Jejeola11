"""Replace pages 8-10 of the protected online ebook with a practical first lesson.

The web reader serves WebP pages. A three-page PDF is also generated as the
editable print source for these pages; it is never exposed as a download.
"""
from pathlib import Path
import fitz
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'server/functions/assets/ai-video-book'
OUT = ROOT / 'scripts/ai-video-first-lesson.pdf'
W, H = 595.28, 841.89
TEAL, MUTED, PAPER = '#00191B', '#315456', '#FFFDF2'
YELLOW, LIME = '#FFE66A', '#DFFF4E'
pdfmetrics.registerFont(TTFont('Fuse', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('FuseBold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))

def wrap(text, width, font='Fuse', size=12.2):
    words = text.split(); lines = []; line = ''
    for word in words:
        candidate = (line + ' ' + word).strip()
        if pdfmetrics.stringWidth(candidate, font, size) > width and line:
            lines.append(line); line = word
        else: line = candidate
    if line: lines.append(line)
    return lines

def paragraph(c, text, y, *, x=55, width=485, size=12.2, leading=19, font='Fuse', color=TEAL):
    c.setFillColor(HexColor(color)); c.setFont(font, size)
    for line in wrap(text, width, font, size):
        c.drawString(x, y, line); y -= leading
    return y

def base(c, page, label):
    c.setFillColor(HexColor(PAPER)); c.rect(0,0,W,H,fill=1,stroke=0)
    c.setFillColor(HexColor(TEAL)); c.rect(0,H-12,W,12,fill=1,stroke=0)
    c.setFillColor(HexColor(LIME if page%2 else YELLOW)); c.rect(0,0,9,H-12,fill=1,stroke=0)
    c.setFillColor(HexColor(MUTED)); c.setFont('FuseBold',9)
    c.drawRightString(W-55,H-55,f'{page:02} / 45')
    c.setStrokeColor(HexColor('#A7C0A4')); c.line(55,50,W-55,50)
    c.setFont('Fuse',8); c.drawString(55,34,'THE NIGERIAN AI VIDEO BUSINESS GUIDE')
    c.drawRightString(W-55,34,label)

def heading(c, text, y, size=24):
    return paragraph(c,text,y,font='FuseBold',size=size,leading=size+7)-10

def section(c, number, title, text, y):
    c.setFillColor(HexColor('#EAF5D8')); c.roundRect(55,y-19,485,27,6,fill=1,stroke=0)
    c.setFillColor(HexColor(TEAL)); c.setFont('FuseBold',10.5)
    c.drawString(67,y-10,f'{number}  {title.upper()}')
    return paragraph(c,text,y-43,size=11.8,leading=18)-15

def callout(c, title, text, y, bg='#F1F8DD'):
    lines=wrap(text,450,'Fuse',11.1)
    h=47+len(lines)*17
    c.setFillColor(HexColor(bg));c.roundRect(55,y-h,485,h,9,fill=1,stroke=0)
    c.setFillColor(HexColor(LIME));c.roundRect(55,y-h,5,h,2,fill=1,stroke=0)
    c.setFillColor(HexColor(TEAL));c.setFont('FuseBold',11);c.drawString(68,y-22,title)
    yy=y-42;c.setFont('Fuse',11.1)
    for line in lines:c.drawString(68,yy,line);yy-=17
    return y-h-20

c=canvas.Canvas(str(OUT),pagesize=(W,H),pageCompression=1)

base(c,8,'THE BRIEF')
y=H-91
y=heading(c,'0. Make Your First',y)
y=heading(c,'Professional AI Video',y,25)
y=paragraph(c,'A complete 20-second product video you can make on a phone. No paid video generator is required for this exercise.',y,size=12.4,leading=20)-17
y=callout(c,'TODAY\'S PRACTICE BRIEF','Imagine a local skincare brand wants a short video showing how its product fits into an everyday routine. Use your own item or a permitted practice photo. Label the finished video "spec concept"; do not imply that the brand hired you.',y)
y=section(c,'01','Choose one real product','Write down its name, who would use it, one verified fact from its packaging or website, and the action you want viewers to take. Keep the original label unchanged. Do not invent reviews or benefits.',y)
y=section(c,'02','Write a four-part 20-second story','0-3s: a relatable question. 3-9s: show the product. 9-16s: show one use or verified benefit. 16-20s: a clear next step. Use a natural voice, not an exaggerated sales claim.',y)
y=callout(c,'TRY THIS SCRIPT EXAMPLE','"Want a simpler morning routine? Here is [product]. After cleansing, I apply [verified usage]. See the product details at [real destination]." Change every bracket using facts you can confirm.',y,'#FFF0CE')
assert y>60,y
c.showPage()

base(c,9,'MAKE THE ASSETS')
y=H-95
y=heading(c,'Create it with free tools',y)
y=paragraph(c,'Use a free writing assistant for the draft and a video editor for motion. Free image features have limits and may change, so your own product photo is a reliable fallback.',y,size=12.2,leading=19)-17
y=section(c,'03','Draft the shot list','Ask a writing assistant: "Using only these verified product facts [paste], draft a 20-second 9:16 product Reel. Give me four shots, simple spoken words, on-screen text and a truthful CTA. Do not invent claims or testimonials." Rewrite the output in your own voice.',y)
y=section(c,'04','Prepare the pictures','Photograph the product near a window: one clean hero shot, one close-up, one in-use shot if possible. You may generate a background or supporting scene with a limited free image tool, but overlay the real product photo in the edit so its packaging stays accurate.',y)
y=section(c,'05','Build motion in CapCut','Start a 9:16 project, add your stills, keep each shot about 3-6 seconds, then use a gentle zoom or position keyframe for movement. Record your own voiceover or use an available licensed voice. Add text captions; check each word by hand.',y)
y=callout(c,'VISUAL PROMPT TO ADAPT','"Vertical 9:16 natural skincare routine background, warm window light, uncluttered bathroom counter, realistic shadows, space in centre for a product photo. No logo, no text, no extra product." Generate only the scene if the tool cannot preserve your real label.',y)
assert y>60,y
c.showPage()

base(c,10,'FINISH AND NEXT STEP')
y=H-95
y=heading(c,'Finish like a professional',y)
y=section(c,'06','Check and export','Put the clearest frame first. Trim pauses, balance the voice and music, then export a vertical MP4. Watch on your phone with sound and muted. Check labels, captions, hands, faces, claims and the CTA. Fix anything that looks false or unreadable.',y)
y=section(c,'07','Show what you made','Keep your final 20-second video and write a short portfolio caption: the practice brief, your concept, the assets and edits you created, and what the video demonstrates. Mark it as a spec concept unless it was commissioned.',y)
y=callout(c,'WHY LEARN CREATOR-STYLE VIDEO?','Brands use creator content in paid ads on TikTok and Meta. IAB reported $37 billion in US creator ad spend in 2025 and projected $44 billion for 2026. That is a broad creator-ad market figure, not AI UGC earnings or a promise of client income.',y,'#FFF0CE')
y=paragraph(c,'If you liked this first exercise, AI UGC is a practical direction to develop: believable hooks, presenter delivery, product consistency, editing and ad-ready variations. A repeatable service takes more practice than one video.',y,size=11.5,leading=18)-17
c.setFillColor(HexColor(TEAL));c.roundRect(55,y-92,485,92,11,fill=1,stroke=0)
c.setFillColor(HexColor(LIME));c.setFont('FuseBold',12);c.drawString(72,y-24,'READY TO LEARN AI UGC MORE DEEPLY?')
c.setFillColor(HexColor('#FFFFFF'));c.setFont('Fuse',10.7);c.drawString(72,y-45,'Explore the AI UGC & Influencer course in Fuse Atelier - ₦4,900.')
c.setFillColor(HexColor(YELLOW));c.roundRect(72,y-78,230,24,12,fill=1,stroke=0)
c.setFillColor(HexColor(TEAL));c.setFont('FuseBold',9.7);c.drawString(84,y-70,'VIEW THE AI UGC COURSE  >')
c.linkURL('https://nestuge.com/academy_ugc_offer',(72,y-78,302,y-54),relative=0)
y-=113
y=paragraph(c,'Sources: IAB 2025 Creator Economy Ad Spend & Strategy Report; TikTok for Business Content Suite; Meta Reels Ads; CapCut Online Video Editor; OpenAI ChatGPT Free Tier FAQ. Tool availability and terms may change.',y,size=8.2,leading=12,color=MUTED)
assert y>60,y
c.showPage();c.save()

pdf=fitz.open(OUT)
assert len(pdf)==3
for offset,page in enumerate(pdf):
    pix=page.get_pixmap(matrix=fitz.Matrix(2.3,2.3),alpha=False)
    from PIL import Image
    import io
    image=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
    image.save(ASSETS/f'{8+offset:02}.webp','WEBP',quality=87,method=6)
toc_path=ROOT/'scripts/ai-video-updated-contents.pdf'
t=canvas.Canvas(str(toc_path),pagesize=(W,H),pageCompression=1)
t.setFillColor(HexColor(PAPER));t.rect(0,0,W,H,fill=1,stroke=0)
t.setFillColor(HexColor(TEAL));t.rect(0,H-14,W,14,fill=1,stroke=0)
t.setFillColor(HexColor(LIME));t.rect(0,0,9,H-14,fill=1,stroke=0)
t.setFillColor(HexColor(MUTED));t.setFont('FuseBold',10);t.drawString(54,H-93,'CONTENTS')
t.setFillColor(HexColor(TEAL));t.setFont('FuseBold',24);t.drawString(54,H-135,'Your path through the guide')
entries=[('Start here: the point of this book',5),('0. Make Your First Professional AI Video',8),
 ('1. Pick a business model and a buyer',11),('2. Seven ways an AI video creator can earn',13),
 ('3. Build visuals a brand can actually use',17),('4. Make a portfolio that answers buying questions',19),
 ('5. Package an offer buyers can understand',23),('6. Price for margin, not for a screenshot',24),
 ('7. Build a pipeline through three channels',25)]
y=H-194
for title,page_no in entries:
    t.setFillColor(HexColor('#FFFFFF'));t.setStrokeColor(HexColor('#BFD2BA'))
    t.roundRect(54,y-37,487,56,7,fill=1,stroke=1)
    t.setFillColor(HexColor(TEAL));t.setFont('FuseBold',12.1)
    t.drawString(69,y-9,title)
    t.drawRightString(522,y-9,str(page_no));y-=65
t.setFillColor(HexColor(MUTED));t.setFont('FuseBold',8)
t.drawString(54,46,'MARYAM JEJEOLA  ·  FUSE ATELIER')
t.showPage();t.save()
p=fitz.open(toc_path)[0]
pix=p.get_pixmap(matrix=fitz.Matrix(2.3,2.3),alpha=False)
Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB').save(ASSETS/'03.webp','WEBP',quality=87,method=6)
print('Updated pages 08-10:', OUT)
