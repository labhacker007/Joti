"""HTML page scraper for extracting articles from regular web pages.

When a user adds a web page URL (not an RSS/Atom feed), this module:
1. Tries to auto-discover an RSS/Atom feed link from the page
2. Falls back to scraping article links directly from the HTML
"""

import hashlib
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup, Tag

from app.core.fetch import safe_fetch_text_sync, FetchError, FetchResult
from app.core.ssrf import ssrf_policy_from_settings
from app.core.logging import logger


HEADERS = {"User-Agent": "Jyoti Feed Reader/1.0"}


def _policy():
    return ssrf_policy_from_settings(enforce_allowlist=None)


def _resolve_url(base: str, href: str) -> str:
    if not href:
        return ""
    if href.startswith(("http://", "https://")):
        return href
    return urljoin(base, href)


def _is_article_url(href: str, base_domain: str) -> bool:
    """Heuristic: is this URL likely an article page (not a category/tag/static page)?"""
    if not href:
        return False
    parsed = urlparse(href)
    path = parsed.path.lower()
    # Skip common non-article paths
    skip_patterns = [
        "/tag/", "/tags/", "/category/", "/categories/", "/author/",
        "/page/", "/search", "/login", "/register", "/about", "/contact",
        "/privacy", "/terms", "/sitemap", "/feed", "/rss", "/atom",
        "/wp-admin", "/wp-login", "/wp-content/", "/cdn-cgi/",
        ".css", ".js", ".png", ".jpg", ".gif", ".svg", ".ico", ".xml",
    ]
    if any(p in path for p in skip_patterns):
        return False
    # Must have some path depth (not just the homepage)
    if path in ("", "/", "/index.html", "/index.php"):
        return False
    # Prefer paths that look like articles (have year/slug patterns or enough depth)
    return True


class HTMLPageScraper:
    """Scrapes articles from regular HTML web pages."""

    def discover_feed_url(self, html: str, base_url: str) -> Optional[str]:
        """Find RSS/Atom feed URL from HTML <link> tags."""
        soup = BeautifulSoup(html, "lxml")
        feed_types = [
            "application/rss+xml",
            "application/atom+xml",
            "application/xml",
            "text/xml",
        ]
        for link in soup.find_all("link", rel="alternate"):
            link_type = (link.get("type") or "").lower()
            if any(ft in link_type for ft in feed_types):
                href = link.get("href", "")
                if href:
                    return _resolve_url(base_url, href)
        return None

    def extract_articles(self, html: str, base_url: str) -> List[Dict]:
        """Extract article entries from an HTML page.

        Looks for:
        1. <article> elements
        2. Heading + link patterns in common blog/news layouts
        3. Link patterns in list items
        """
        soup = BeautifulSoup(html, "lxml")
        base_domain = urlparse(base_url).netloc
        entries: List[Dict] = []
        seen_urls: set = set()

        # Strategy 1: <article> elements
        for article_el in soup.find_all("article"):
            entry = self._parse_article_element(article_el, base_url, base_domain)
            if entry and entry["url"] not in seen_urls:
                seen_urls.add(entry["url"])
                entries.append(entry)

        # Strategy 2: Headings with links (h1-h3 with <a> inside)
        for tag_name in ("h2", "h3", "h1"):
            for heading in soup.find_all(tag_name):
                link = heading.find("a", href=True)
                if not link:
                    # Check if heading itself is inside an <a>
                    parent_a = heading.find_parent("a", href=True)
                    if parent_a:
                        link = parent_a
                if link:
                    href = _resolve_url(base_url, link.get("href", ""))
                    if href and href not in seen_urls and _is_article_url(href, base_domain):
                        title = link.get_text(strip=True) or heading.get_text(strip=True)
                        if title and len(title) > 5:
                            # Try to get a snippet from nearby text
                            snippet = self._get_nearby_text(heading)
                            seen_urls.add(href)
                            entries.append({
                                "external_id": hashlib.sha256(href.encode()).hexdigest()[:32],
                                "title": title[:300],
                                "url": href,
                                "published_at": None,
                                "raw_content": "",
                                "summary": snippet[:500] if snippet else "",
                                "image_url": self._find_nearby_image(heading, base_url),
                            })

        # Strategy 3: List items with links
        if len(entries) < 3:
            for li in soup.find_all("li"):
                link = li.find("a", href=True)
                if link:
                    href = _resolve_url(base_url, link.get("href", ""))
                    if href and href not in seen_urls and _is_article_url(href, base_domain):
                        title = link.get_text(strip=True)
                        if title and len(title) > 10:
                            seen_urls.add(href)
                            entries.append({
                                "external_id": hashlib.sha256(href.encode()).hexdigest()[:32],
                                "title": title[:300],
                                "url": href,
                                "published_at": None,
                                "raw_content": "",
                                "summary": "",
                                "image_url": None,
                            })

        return entries[:50]  # Cap at 50 articles per page

    def fetch_article_content(self, url: str) -> Optional[Dict]:
        """Fetch an individual article page and extract main content, date, image."""
        try:
            result = safe_fetch_text_sync(
                url, policy=_policy(), headers=HEADERS, timeout_seconds=15.0, max_bytes=2_000_000,
            )
        except FetchError as e:
            logger.warning("html_scraper_fetch_failed", url=url, error=str(e))
            return None

        soup = BeautifulSoup(result.text, "lxml")

        # Extract main content
        content = self._extract_main_content(soup)

        # Extract published date
        published_at = self._extract_date(soup)

        # Extract image
        image_url = self._extract_image(soup, url)

        return {
            "raw_content": content,
            "published_at": published_at,
            "image_url": image_url,
        }

    # ---- Private helpers ----

    def _parse_article_element(self, el: Tag, base_url: str, base_domain: str) -> Optional[Dict]:
        """Extract article data from an <article> HTML element."""
        # Find the main link
        link = None
        for tag in ("h2", "h3", "h1", "h4"):
            heading = el.find(tag)
            if heading:
                link = heading.find("a", href=True)
                if link:
                    break
        if not link:
            link = el.find("a", href=True)
        if not link:
            return None

        href = _resolve_url(base_url, link.get("href", ""))
        if not href or not _is_article_url(href, base_domain):
            return None

        title = link.get_text(strip=True)
        if not title or len(title) < 5:
            heading = el.find(re.compile(r"^h[1-4]$"))
            title = heading.get_text(strip=True) if heading else ""
        if not title or len(title) < 5:
            return None

        # Snippet
        summary = ""
        for p in el.find_all("p"):
            text = p.get_text(strip=True)
            if len(text) > 30:
                summary = text[:500]
                break

        # Image
        img = el.find("img", src=True)
        image_url = _resolve_url(base_url, img["src"]) if img else None

        # Date
        time_el = el.find("time", datetime=True)
        published_at = None
        if time_el:
            try:
                published_at = datetime.fromisoformat(time_el["datetime"].replace("Z", "+00:00"))
            except (ValueError, TypeError):
                pass

        return {
            "external_id": hashlib.sha256(href.encode()).hexdigest()[:32],
            "title": title[:300],
            "url": href,
            "published_at": published_at,
            "raw_content": "",
            "summary": summary,
            "image_url": image_url,
        }

    def _get_nearby_text(self, heading: Tag) -> str:
        """Get text from the next sibling paragraph or parent container."""
        for sibling in heading.find_next_siblings():
            if sibling.name == "p":
                text = sibling.get_text(strip=True)
                if len(text) > 20:
                    return text
            if sibling.name and sibling.name.startswith("h"):
                break  # Hit next heading, stop
        # Try parent container
        parent = heading.parent
        if parent:
            for p in parent.find_all("p"):
                text = p.get_text(strip=True)
                if len(text) > 20:
                    return text
        return ""

    def _find_nearby_image(self, heading: Tag, base_url: str) -> Optional[str]:
        """Find an image near a heading element."""
        parent = heading.parent
        if parent:
            img = parent.find("img", src=True)
            if img:
                return _resolve_url(base_url, img["src"])
        # Check previous sibling
        prev = heading.find_previous_sibling("img", src=True)
        if prev:
            return _resolve_url(base_url, prev["src"])
        return None

    def _extract_main_content(self, soup: BeautifulSoup) -> str:
        """Extract the main article content from a page."""
        # Priority: <article>, <main>, [role=main], .post-content, .article-body, .entry-content
        selectors = [
            "article",
            "main",
            "[role=main]",
            ".post-content",
            ".article-body",
            ".entry-content",
            ".post-body",
            ".story-body",
            "#content",
        ]
        for selector in selectors:
            el = soup.select_one(selector)
            if el:
                text = el.get_text(separator="\n", strip=True)
                if len(text) > 100:
                    # Return HTML for richer content
                    return str(el)

        # Fallback: largest text block
        best = ""
        for div in soup.find_all(["div", "section"]):
            text = div.get_text(separator="\n", strip=True)
            if len(text) > len(best):
                best = text
        return best[:10000] if best else ""

    def _extract_date(self, soup: BeautifulSoup) -> Optional[datetime]:
        """Extract published date from article page."""
        # 1. Open Graph
        og_date = soup.find("meta", property="article:published_time")
        if og_date and og_date.get("content"):
            try:
                return datetime.fromisoformat(og_date["content"].replace("Z", "+00:00"))
            except (ValueError, TypeError):
                pass

        # 2. JSON-LD
        for script in soup.find_all("script", type="application/ld+json"):
            try:
                import json
                data = json.loads(script.string or "")
                if isinstance(data, list):
                    data = data[0] if data else {}
                date_str = data.get("datePublished") or data.get("dateCreated")
                if date_str:
                    return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            except (ValueError, TypeError, json.JSONDecodeError):
                pass

        # 3. <time> element
        time_el = soup.find("time", datetime=True)
        if time_el:
            try:
                return datetime.fromisoformat(time_el["datetime"].replace("Z", "+00:00"))
            except (ValueError, TypeError):
                pass

        # 4. Meta tags
        for name in ("date", "publish_date", "article:published", "DC.date.issued"):
            meta = soup.find("meta", attrs={"name": name}) or soup.find("meta", attrs={"property": name})
            if meta and meta.get("content"):
                try:
                    return datetime.fromisoformat(meta["content"].replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    pass

        return None

    def _extract_image(self, soup: BeautifulSoup, base_url: str) -> Optional[str]:
        """Extract the main image from an article page."""
        # 1. og:image
        og = soup.find("meta", property="og:image")
        if og and og.get("content"):
            return _resolve_url(base_url, og["content"])

        # 2. twitter:image
        tw = soup.find("meta", attrs={"name": "twitter:image"})
        if tw and tw.get("content"):
            return _resolve_url(base_url, tw["content"])

        # 3. First large image in article/main
        for container in soup.select("article, main, [role=main], .post-content"):
            img = container.find("img", src=True)
            if img:
                return _resolve_url(base_url, img["src"])

        return None
