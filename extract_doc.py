import zipfile, re, html, io, sys, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
p = r'D:\微信和qq缓存\微信缓存\xwechat_files\wxid_bj2r824clo4a22_b65a\msg\file\2026-10\2030目标App_六套主题配色开发文档-3.docx'
print('exists:', os.path.exists(p))
z = zipfile.ZipFile(p)
xml = z.read('word/document.xml').decode('utf-8')
xml = re.sub(r'</w:p>', '\n', xml)
xml = re.sub(r'<w:tab/>', '\t', xml)
txt = html.unescape(re.sub(r'<[^>]+>', '', xml))
lines = [l.strip() for l in txt.split('\n')]
out = '\n'.join([l for l in lines if l])
with open(r'D:\桌面\日历\theme_doc.txt', 'w', encoding='utf-8') as f:
    f.write(out)
print('chars:', len(out))
