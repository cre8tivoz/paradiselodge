import sys, shutil, time
from gradio_client import Client, handle_file
img, tag, res = sys.argv[1], sys.argv[2], sys.argv[3]
c = Client('microsoft/TRELLIS.2', verbose=False)
try: c.predict(api_name='/start_session')
except Exception as e: print('start_session', e)
t=time.time()
pre = c.predict(input=handle_file(img), api_name='/preprocess_image'); print('pre', pre)
r = c.predict(image=handle_file(pre), seed=1, resolution=res, api_name='/image_to_3d'); print('i23d', time.time()-t, str(r)[:300])
g = c.predict(decimation_target=150000, texture_size=2048, api_name='/extract_glb'); print('glb', time.time()-t, g)
shutil.copy(g[1] or g[0], f'out-{tag}.glb'); print('saved')
