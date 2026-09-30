from PIL import Image, ImageDraw, ImageFont
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',28)
S=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',20)
v1=Image.open('out/phase2/reception-rosie3d.png').convert('RGB')
v2=Image.open('out/phase2/v2/reception-rosie3d-v2.png').convert('RGB')
W=1920; col=W//2
def fit(im,w,h):
    s=min(w/im.width,h/im.height); return im.resize((int(im.width*s),int(im.height*s)),Image.LANCZOS)
    im=im.copy(); im.thumbnail((w,h)); return im
rows=[]
# row1: full stills
r=Image.new('RGB',(W,540+40),(18,18,18)); r.paste(v1.resize((960,540)),(0,40)); r.paste(v2.resize((960,540)),(960,40))
d=ImageDraw.Draw(r); d.text((10,6),'v1  reception (rosie=3d)',font=F,fill='white'); d.text((970,6),'v2  reception (rosie=3dv2, nearer lamp)',font=F,fill='white'); rows.append(r)
# row2: face crops + sheet
f1=v1.crop((640,300,1080,660)); f2=v2.crop((440,330,1080,850))
sh=Image.open('ref/img/rosie-sheet.jpg').convert('RGB')
r=Image.new('RGB',(W,560+40),(18,18,18)); d=ImageDraw.Draw(r)
a=fit(f1,620,560); b=fit(f2,620,560); c=fit(sh,660,560)
r.paste(a,(0,40)); r.paste(b,(630,40)); r.paste(c,(1260,40))
d.text((10,6),'v1 face (crop)',font=F,fill='white'); d.text((640,6),'v2 face (crop)',font=F,fill='white'); d.text((1270,6),'reference sheet',font=F,fill='white'); rows.append(r)
# rows 3/4: turntables
for lab,dirn in [('v1 turntable','tmp/turn'),('v2 turntable (A-pose, Mixamo-ready)','tmp/turn2')]:
    r=Image.new('RGB',(W,270+40),(18,18,18)); d=ImageDraw.Draw(r); d.text((10,6),lab,font=F,fill='white')
    for i,n in enumerate([0,15,30,45,60,75,90,105]):
        fr=Image.open(f'{dirn}/f{n:04d}.png').convert('RGB').crop((320,0,960,720)).resize((240,270))
        r.paste(fr,(i*240,40))
    rows.append(r)
H=sum(x.height for x in rows)+50
out=Image.new('RGB',(W,H),(18,18,18)); y=0
for x in rows: out.paste(x,(0,y)); y+=x.height
ImageDraw.Draw(out).text((10,y+12),'Paradise Lodge - Rosie 3D v1 vs v2  (Hunyuan3D-2 shape, box-baked textures)',font=S,fill=(180,180,180))
out.save('out/phase2/v2/v1-vs-v2-sheet.jpg',quality=90); print(out.size)
