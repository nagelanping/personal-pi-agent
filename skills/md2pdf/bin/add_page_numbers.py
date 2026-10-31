import io
import sys

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas

# 在每页底部居中叠加页号；只写字号 9 的 Helvetica 数字，不改动原页面内容
src, dst = sys.argv[1], sys.argv[2]
reader = PdfReader(src)
writer = PdfWriter()
for i, page in enumerate(reader.pages, 1):
    w, h = float(page.mediabox.width), float(page.mediabox.height)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=(w, h))
    c.setFillGray(0.4)
    c.setFont("Helvetica", 9)
    c.drawCentredString(w / 2, 16, str(i))
    c.save()
    buf.seek(0)
    page.merge_page(PdfReader(buf).pages[0])
    writer.add_page(page)
    writer.pages[-1].compress_content_streams()
with open(dst, "wb") as f:
    writer.write(f)
