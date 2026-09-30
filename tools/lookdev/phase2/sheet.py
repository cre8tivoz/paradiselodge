from PIL import Image, ImageDraw, ImageFont
F=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',30); f2=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
bb=Image.open('out/stills/reception-rosie.png').convert('RGB'); d3=Image.open('out/phase2/reception-rosie3d.png').convert('RGB')
sheet=Image.open('ref/img/rosie-sheet.jpg').convert('RGB')
G=16; W=2*1280+3*G; H=64+720+G+56+420+48
S=Image.new('RGB',(W,H),(24,20,18)); d=ImageDraw.Draw(S)
for i,(t,im) in enumerate([('BILLBOARD (phase 1, lit photo card)',bb),('3D ROSIE (phase 2, Hunyuan3D-2 shape + box-baked texture)',d3)]):
    x=G+i*(1280+G); d.text((x,18),t,font=F,fill=(235,205,160)); S.paste(im.resize((1280,720),Image.LANCZOS),(x,64))
y=64+720+G; d.text((G,y+10),'face @ 3x, same camera:  billboard | 3D   ·   character sheet   ·   3D model on its own: front / three-quarter / profile / back',font=f2,fill=(200,185,165)); y+=56
box=(720,350,1000,630)
tiles=[bb.crop(box).resize((420,420)), d3.crop(box).resize((420,420)), sheet.resize((630,420),Image.LANCZOS)]
for n in [0,15,30,60]:
    im=Image.open('tmp/turn/f%04d.png'%n).convert('RGB').crop((400,0,880,720)).resize((280,420)); tiles.append(im)
x=G
for t in tiles: S.paste(t,(x,y)); x+=t.width+10
d.text((G,y+430),'out/stills/reception-rosie.png  vs  out/phase2/reception-rosie3d.png   (40k tris, 2048 albedo, static pose, not rigged)',font=f2,fill=(160,150,140))
S.save('out/phase2/billboard-vs-3d-sheet.jpg',quality=90); print(S.size)
