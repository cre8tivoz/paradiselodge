import sys, time, subprocess
from gradio_client import Client, handle_file
space, tag = sys.argv[1], sys.argv[2]; kw = dict(a.split('=',1) for a in sys.argv[3:])
octree = int(kw.pop('octree', 256))
c = Client(space, verbose=False)
args = dict(image=None, mv_image_front=None, mv_image_back=None, mv_image_left=None, mv_image_right=None, steps=30, guidance_scale=5.0, seed=1234,
            octree_resolution=octree, check_box_rembg=True, num_chunks=8000, randomize_seed=False, api_name='/shape_generation')
if 'Hunyuan3D-2.1' not in space: args['caption'] = None
for k, v in kw.items(): args[k] = handle_file(v)
t = time.time(); r = c.predict(**args); p = r[0]['value'] if isinstance(r[0], dict) else r[0]
print('took', round(time.time()-t,1), r[2].get('number_of_faces'), p)
host = 'https://' + space.lower().replace('/', '-').replace('.', '-') + '.hf.space'
subprocess.run(['curl', '-sfL', '-o', f'out-{tag}.glb', f'{host}/file={p}'], check=True); print('saved', tag)
