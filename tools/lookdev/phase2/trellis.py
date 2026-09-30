import sys, shutil, time
from gradio_client import Client, handle_file
img, tag = sys.argv[1], sys.argv[2]
c = Client('trellis-community/TRELLIS', verbose=False)
try: c.predict(api_name='/start_session')
except Exception as e: print('start_session', e)
t=time.time()
r = c.predict(image=handle_file(img), multiimages=[], seed=int(sys.argv[3]) if len(sys.argv)>3 else 1, ss_guidance_strength=7.5, ss_sampling_steps=12,
              slat_guidance_strength=3.0, slat_sampling_steps=12, multiimage_algo='stochastic', mesh_simplify=0.95, texture_size=2048,
              api_name='/generate_and_extract_glb')
print('took', time.time()-t, r)
vid, glb, dl = r
shutil.copy(dl or glb, f'out-{tag}.glb')
if vid and vid.get('video'): shutil.copy(vid['video'], f'out-{tag}.mp4')
print('saved', tag)
