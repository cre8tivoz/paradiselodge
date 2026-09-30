import sys
from gradio_client import Client
for sp in sys.argv[1:]:
    try:
        c=Client(sp, verbose=False)
        print('=====',sp); c.view_api(print_info=True)
    except Exception as e: print('=====',sp,'FAIL',type(e).__name__,str(e)[:300])
