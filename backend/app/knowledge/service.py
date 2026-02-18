"""Document processing service with PDF, Word, Excel, HTML, and text extraction."""
from pathlib import Path
from typing import Optional

KNOWLEDGE_STORAGE_PATH = Path("/tmp/knowledge")


class DocumentProcessor:
    """Extracts text content from various document formats."""

    @staticmethod
    async def extract(source_type: str, source: str, mime_type: Optional[str] = None) -> str:
        """Extract text from a file path or URL.

        Args:
            source_type: "file" or "url"
            source: File path or URL string
            mime_type: Optional MIME type hint

        Returns:
            Extracted text content
        """
        if source_type == "file":
            return DocumentProcessor._extract_from_file(source, mime_type)
        elif source_type == "url":
            return DocumentProcessor._extract_from_url(source)
        return ""

    @staticmethod
    def extract_from_bytes(data: bytes, filename: str) -> str:
        """Extract text from raw file bytes based on file extension.

        Args:
            data: Raw file bytes
            filename: Original filename (used to detect type)

        Returns:
            Extracted text content
        """
        suffix = Path(filename).suffix.lower()

        if suffix == ".pdf":
            return DocumentProcessor._extract_pdf_bytes(data)
        elif suffix in (".docx", ".doc"):
            return DocumentProcessor._extract_docx_bytes(data)
        elif suffix in (".xlsx", ".xls"):
            return DocumentProcessor._extract_excel_bytes(data)
        elif suffix == ".csv":
            return data.decode("utf-8", errors="replace")
        elif suffix in (".html", ".htm"):
            return DocumentProcessor._extract_html(data.decode("utf-8", errors="replace"))
        elif suffix in (".txt", ".md", ".json", ".xml"):
            return data.decode("utf-8", errors="replace")
        else:
            return data.decode("utf-8", errors="replace")

    @staticmethod
    def _extract_from_file(filepath: str, mime_type: Optional[str] = None) -> str:
        path = Path(filepath)
        suffix = path.suffix.lower()
        data = path.read_bytes()

        if suffix == ".pdf" or (mime_type and "pdf" in mime_type):
            return DocumentProcessor._extract_pdf_bytes(data)
        elif suffix in (".docx", ".doc") or (mime_type and "word" in mime_type):
            return DocumentProcessor._extract_docx_bytes(data)
        elif suffix in (".xlsx", ".xls") or (mime_type and "spreadsheet" in mime_type):
            return DocumentProcessor._extract_excel_bytes(data)
        elif suffix in (".html", ".htm") or (mime_type and "html" in mime_type):
            return DocumentProcessor._extract_html(data.decode("utf-8", errors="replace"))
        else:
            return data.decode("utf-8", errors="replace")

    @staticmethod
    def _extract_from_url(url: str) -> str:
        from app.core.ssrf import validate_outbound_url, ssrf_policy_from_settings
        import requests
        try:
            # Validate URL against SSRF policy before fetching
            policy = ssrf_policy_from_settings()
            validate_outbound_url(url, policy=policy)
            resp = requests.get(url, timeout=30, headers={"User-Agent": "Joti/1.0"})
            resp.raise_for_status()
            return DocumentProcessor._extract_html(resp.text)
        except Exception:
            return ""

    @staticmethod
    def _extract_pdf_bytes(data: bytes) -> str:
        import io
        from pypdf import PdfReader
        try:
            reader = PdfReader(io.BytesIO(data))
            pages = []
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    pages.append(text)
            return "\n\n".join(pages)
        except Exception:
            return ""

    @staticmethod
    def _extract_docx_bytes(data: bytes) -> str:
        import io
        from docx import Document
        try:
            doc = Document(io.BytesIO(data))
            paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
            return "\n\n".join(paragraphs)
        except Exception:
            return ""

    @staticmethod
    def _extract_excel_bytes(data: bytes) -> str:
        import io
        try:
            import pandas as pd
            df = pd.read_excel(io.BytesIO(data), engine="openpyxl")
            return df.to_string(index=False)
        except Exception:
            return ""

    @staticmethod
    def _extract_html(html: str) -> str:
        from bs4 import BeautifulSoup
        try:
            soup = BeautifulSoup(html, "lxml")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            return soup.get_text(separator="\n", strip=True)
        except Exception:
            return html
