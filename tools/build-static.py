"""Package the existing static site for a private review without changing GitHub Pages.
Run the existing page generators before this script.
"""
from pathlib import Path
import shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'dist'
PREVIEW_ORIGIN='https://damla-ringatelier.comet-frost-3480.chatgpt.site'
if OUT.exists():
    assert OUT.resolve().parent==ROOT and OUT.name=='dist'
    shutil.rmtree(OUT)
OUT.mkdir()
for file in ROOT.iterdir():
    if file.suffix in ('.html','.css') and not file.name.endswith(('.body.html','.src.html')):
        if file.suffix=='.html':
            content=file.read_text(encoding='utf-8').replace('https://adamanm780-dotcom.github.io/juwelier-damla',PREVIEW_ORIGIN)
            (OUT/file.name).write_text(content,encoding='utf-8')
        else:
            shutil.copy2(file,OUT/file.name)
# The pre-existing untracked katalog folder belongs to separate work and is unused here.
shutil.copytree(ROOT/'assets',OUT/'assets',ignore=shutil.ignore_patterns('katalog'))
print('Static site ready:',sum(1 for p in OUT.rglob('*') if p.is_file()),'files')
