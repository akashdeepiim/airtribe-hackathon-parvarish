#!/usr/bin/env python3
"""Build Parvarish KB PDFs and text files from editable Markdown; no network access."""
from __future__ import annotations

import hashlib
import html
import json
import os
from pathlib import Path
import re
import subprocess
import sys

from pypdf import PdfReader
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, HRFlowable

PACK = Path(__file__).resolve().parent.parent
REPO = next((p for p in PACK.parents if (p / "app").is_dir() and (p / "package.json").exists()), None)
FONT_DIR = Path(os.environ.get("PARVARISH_KB_FONT_DIR", str(Path.home() / ".cache/codex-runtimes/codex-primary-runtime/dependencies/native/libreoffice-headless/libreoffice/LibreOfficeDev.app/Contents/Resources/fonts/truetype")))
if (FONT_DIR / "DejaVuSans.ttf").exists():
    pdfmetrics.registerFont(TTFont("KB", str(FONT_DIR / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("KB-Bold", str(FONT_DIR / "DejaVuSans-Bold.ttf")))
    NORMAL, BOLD = "KB", "KB-Bold"
else:
    NORMAL, BOLD = "Helvetica", "Helvetica-Bold"

INK = colors.HexColor("#243B35")
FOREST = colors.HexColor("#254E40")
MUTED = colors.HexColor("#5B6A63")
LINE = colors.HexColor("#DCE4DC")
GOLD = colors.HexColor("#C79859")
PAGE_W, PAGE_H = A4

STYLES = {
    "title": ParagraphStyle("Title", fontName=BOLD, fontSize=24, leading=29, textColor=FOREST, spaceAfter=12),
    "meta": ParagraphStyle("Meta", fontName=NORMAL, fontSize=8.1, leading=12, textColor=MUTED, spaceAfter=8),
    "scope": ParagraphStyle("Scope", fontName=NORMAL, fontSize=9.2, leading=13.5, textColor=MUTED, spaceAfter=15),
    "h2": ParagraphStyle("Section", fontName=BOLD, fontSize=11.5, leading=16, textColor=FOREST, spaceBefore=11, spaceAfter=6, keepWithNext=True),
    "body": ParagraphStyle("Body", fontName=NORMAL, fontSize=9.7, leading=14.1, textColor=INK, spaceAfter=8, alignment=TA_LEFT),
    "list": ParagraphStyle("List", fontName=NORMAL, fontSize=9.7, leading=14.1, textColor=INK, leftIndent=12, firstLineIndent=-10, spaceAfter=5),
    "source": ParagraphStyle("Source", fontName=NORMAL, fontSize=7.8, leading=11, textColor=MUTED, spaceAfter=4),
    "url": ParagraphStyle("URL", fontName=NORMAL, fontSize=7.4, leading=10.5, textColor=FOREST, splitLongWords=True, spaceAfter=7),
}

SOURCE_FILES = [
    "docs/DECISIONS.md", "docs/ACCESS.md", "docs/CHAT.md", "docs/PRD.md",
    "src/screens/Information.web.tsx", "app/sign-in.tsx", "app/family.tsx",
    "app/children/new.tsx", "app/children/[id]/index.tsx",
    "app/children/[id]/family.tsx", "app/children/[id]/privacy.tsx", "app/invite.tsx",
    "src/components/ProfileForm.tsx", "src/components/ConsentFlow.tsx",
    "src/domain/schemas.ts", "src/domain/consent.ts", "src/domain/invites.ts",
    "src/lib/photos.ts", "src/lib/errors.ts", "src/components/chat/ChatWidget.web.tsx",
    "src/lib/chat.ts", "api/chat.ts", "supabase/migrations/202610240002_operations.sql",
]

def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()

def wrap_page(document_id: str, running_title: str):
    def draw(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(FOREST)
        canvas.setFont(BOLD, 8.3)
        canvas.drawString(48, PAGE_H - 30, "PARVARISH")
        canvas.setFillColor(MUTED)
        canvas.setFont(NORMAL, 7.4)
        canvas.drawRightString(PAGE_W - 48, PAGE_H - 30, "KNOWLEDGE BASE  /  " + document_id)
        canvas.setStrokeColor(LINE)
        canvas.line(48, PAGE_H - 39, PAGE_W - 48, PAGE_H - 39)
        canvas.setFillColor(GOLD)
        canvas.rect(48, PAGE_H - 41, 33, 2, fill=1, stroke=0)
        canvas.setStrokeColor(LINE)
        canvas.line(48, 41, PAGE_W - 48, 41)
        canvas.setFillColor(MUTED)
        canvas.setFont(NORMAL, 7)
        canvas.drawString(48, 27, "v1.0  |  24 October 2026  |  " + document_id)
        canvas.drawRightString(PAGE_W - 48, 27, str(doc.page))
        canvas.restoreState()
    return draw

def markup(text: str) -> str:
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", text)
    return text

def build_doc(md_path: Path) -> dict:
    raw = md_path.read_text(encoding="utf-8")
    if re.search("[\u2010-\u2015\u2212]", raw):
        raise ValueError(f"Use ASCII hyphens: {md_path.name}")
    title = raw.splitlines()[0].removeprefix("# ")
    document_id = re.search(r"Document: (PAR-KB-\d+)", raw).group(1)
    pdf_path = PACK / "upload/pdf" / (md_path.stem + ".pdf")
    txt_path = PACK / "upload/txt" / (md_path.stem + ".txt")
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    txt_path.parent.mkdir(parents=True, exist_ok=True)
    text_copy = raw.replace("<!-- pagebreak -->\n", "")
    text_copy = re.sub(r"^#{1,3} ", "", text_copy, flags=re.M)
    text_copy = text_copy.replace("**", "")
    txt_path.write_text(text_copy, encoding="utf-8")

    story = []
    in_sources = False
    for block in re.split(r"\n\s*\n", raw.strip()):
        block = block.strip()
        if block == "<!-- pagebreak -->":
            story.append(PageBreak())
        elif block.startswith("# "):
            story.append(Paragraph(markup(block[2:]), STYLES["title"]))
        elif block.startswith("## "):
            heading = block[3:]
            in_sources = heading.startswith(("Sources and", "Source and", "Basis for"))
            story.append(Paragraph(markup(heading), STYLES["h2"]))
        elif block.startswith("Document:"):
            story.append(Paragraph(markup(block), STYLES["meta"]))
        elif block.startswith("Scope:"):
            story.append(Paragraph(markup(block), STYLES["scope"]))
        elif block.startswith("- ") or re.match(r"^\d+\. ", block):
            for line in block.splitlines():
                story.append(Paragraph(markup(line), STYLES["list"]))
        else:
            # Source labels and URLs are separate paragraphs to keep extraction order clear.
            parts = block.splitlines()
            if any(p.startswith("https://") for p in parts):
                for part in parts:
                    if part.startswith("https://"):
                        url = html.escape(part, quote=True)
                        story.append(Paragraph(f'<link href="{url}" color="#254E40">{url}</link>', STYLES["url"]))
                    elif part:
                        story.append(Paragraph(markup(part), STYLES["source"]))
            else:
                style = STYLES["source"] if in_sources else STYLES["body"]
                story.append(Paragraph(markup(" ".join(parts)), style))

    pdf = SimpleDocTemplate(str(pdf_path), pagesize=A4, rightMargin=48, leftMargin=48,
        topMargin=59, bottomMargin=57, title=title, author="Parvarish",
        subject=f"{document_id} - Parvarish chatbot knowledge base v1.0",
        pageCompression=1)
    pdf.build(story, onFirstPage=wrap_page(document_id, title), onLaterPages=wrap_page(document_id, title))
    reader = PdfReader(pdf_path)
    extracted = "\n".join(page.extract_text() or "" for page in reader.pages)
    # Ignore layout whitespace, but require every text-bearing block to survive extraction.
    normalized_pdf = re.sub(r"\s+", "", extracted)
    normalized_source = re.sub(r"\s+", "", text_copy)
    for block in re.split(r"\n\s*\n", text_copy):
        needle = re.sub(r"\s+", "", block)
        if needle and needle not in normalized_pdf:
            raise AssertionError(f"Text extraction mismatch in {document_id}: {block[:100]}")
    if len(extracted.strip()) < 1000:
        raise AssertionError(f"Too little extractable text in {document_id}")
    # Scan the upload corpus for credential-like strings, internal env references and placeholders.
    prohibited = [r"AGENTICORG_API_KEY", r"Bearer\s+[A-Za-z0-9]", r"eyJ[A-Za-z0-9_-]{20,}",
                  r"<agent-uuid>", r"127\.0\.0\.1", r"/Users/", r"(?i)\bTODO\b"]
    for pattern in prohibited:
        if re.search(pattern, raw):
            raise AssertionError(f"Unexpected upload content in {document_id}: {pattern}")
    return {
        "id": document_id, "title": title, "version": "1.0", "review_date": "2026-10-24",
        "language": "en", "category": "platform_help" if int(document_id[-2:]) < 6 else "non_clinical_parenting",
        "pdf_pages": len(reader.pages), "word_count": len(text_copy.split()),
        "files": [{"path": str(p.relative_to(PACK)), "bytes": p.stat().st_size, "sha256": sha(p)} for p in (md_path, pdf_path, txt_path)],
        "text_extraction_verified": True,
    }

def main():
    files = sorted((PACK / "editable").glob("*.md"))
    if len(files) != 8:
        raise ValueError(f"Expected 8 Markdown sources, found {len(files)}")
    docs = [build_doc(p) for p in files]
    if REPO:
        commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=REPO, text=True, capture_output=True, check=True).stdout.strip()
        snapshot = {
            "review_date": "2026-10-24", "git_head": commit,
            "note": "Hashes identify reviewed local files; HEAD alone excludes uncommitted work. No environment files captured.",
            "files": [{"path": name, "sha256": sha(REPO / name)} for name in SOURCE_FILES if (REPO / name).exists()],
        }
        (PACK / "admin/source-snapshot.json").write_text(json.dumps(snapshot, indent=2) + "\n")
    manifest = {"pack": "Parvarish knowledge base", "version": "1.0", "date": "2026-10-24",
        "documents": docs, "live_ingestion_tested": False,
        "note": "Choose one upload format per document; PDFs and TXT are duplicate representations."}
    (PACK / "admin/manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(json.dumps({"documents": len(docs), "pages": sum(d["pdf_pages"] for d in docs), "results": [
        {"id": d["id"], "pages": d["pdf_pages"], "words": d["word_count"]} for d in docs]}, indent=2))

if __name__ == "__main__":
    main()
