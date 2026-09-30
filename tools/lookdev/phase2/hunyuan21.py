import sys, shutil, time
from gradio_client import Client, handle_file
space, img, tag = sys.argv[1], sys.argv[2], sys.argv[3]
c = Client(space, verbose=False)
t=time.time()
r = c.predict(image=handle_file(img), mv_image_front=None, mv_image_back=None, mv_image_left=None, mv_image_right=None,
              steps=30, guidance_scale=5.0, seed=1234, octree_resolution=256, check_box_rembg=True, num_chunks=8000, randomize_seed=False,
              api_name='/generation_all')
print('took', time.time()-t); print(r)
shutil.copy(r[0], f'out-{tag}-white.glb'); shutil.copy(r[1], f'out-{tag}-tex.glb'); print('saved')
