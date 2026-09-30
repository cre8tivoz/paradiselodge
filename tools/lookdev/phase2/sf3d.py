import sys, shutil, time
from gradio_client import Client, handle_file
img, tag = sys.argv[1], sys.argv[2]
c = Client('stabilityai/stable-fast-3d', verbose=False)
t=time.time()
r = c.predict(input_image=handle_file(img), foreground_ratio=0.85, remesh_option='None', vertex_count=-1, texture_size=1024, api_name='/run_button')
print('took', time.time()-t, r); shutil.copy(r[1], f'out-{tag}.glb'); print('saved')
