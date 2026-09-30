# Before/after sheets: REFERENCE | BEFORE (current game) | AFTER (look test), identical panel sizes.
from PIL import Image, ImageDraw, ImageFont
R='ref/img/'; PW,PH,HD,G=1280,720,64,16
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',30)
f2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
def fit(paths):
    c=Image.new('RGB',(PW,PH),(12,10,9)); n=len(paths); h=(PH-(n-1)*8)//n; y=0
    for p in paths:
        im=Image.open(p).convert('RGB'); s=min(PW/im.width,h/im.height); im=im.resize((int(im.width*s),int(im.height*s)),Image.LANCZOS)
        c.paste(im,((PW-im.width)//2,y+(h-im.height)//2)); y+=h+8
    return c
S={
 'reception-rosie':([R+'03-reception-with-rosie.jpg'],'out/before/reception-rosie-currentgame-rebuild.png','REBUILT from repo code + live lightmaps/HDRI, same camera'),
 'hall-stairs':([R+'1a-stairs.jpg'],'out/before/hall-stairs-currentgame-rebuild.png','REBUILT from repo code + live lightmaps/HDRI, same camera'),
 'parlour':([R+'05-the-parlour.jpg',R+'1a-parlour.jpg'],'out/before/parlour-currentgame-rebuild.png','REBUILT from repo code + live lightmaps/HDRI, same camera'),
 'exterior-dusk':([R+'01-title-card-the-paradise-lodge.jpg',R+'02-miller-at-the-lodge-exterior.jpg'],'out/before/exterior-dusk-currentgame-live.jpg','LIVE capture, paradiselodge-game.pages.dev (not same camera)'),
}
for k,(refs,before,note) in S.items():
    W=3*PW+4*G; H=PH+HD+G+40
    sh=Image.new('RGB',(W,H),(24,20,18)); d=ImageDraw.Draw(sh)
    cols=[('REFERENCE (concept)',fit(refs),', '.join(r.split('/')[-1] for r in refs)),('BEFORE (current game)',fit([before]),note),('AFTER (look test)',fit(['out/stills/%s.png'%k]),'out/stills/%s.png  three.js 0.180, all code'%k)]
    for i,(t,im,sub) in enumerate(cols):
        x=G+i*(PW+G); d.text((x,18),t,font=F,fill=(235,205,160)); sh.paste(im,(x,HD)); d.text((x,HD+PH+10),sub,font=f2,fill=(170,160,150))
    sh.save('out/sheets/%s-before-after.jpg'%k,quality=90); print(k)
