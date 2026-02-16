# How Feedly Extracts Images from RSS Feeds

## Overview
Feedly extracts images from RSS/Atom feeds and web pages to provide rich visual previews in card view. This document explains the techniques used.

## Image Extraction Sources (Priority Order)

### 1. RSS/Atom Feed Elements
Feedly checks for images in feed entries in this order:

#### a. Media RSS (`media:content`, `media:thumbnail`)
```xml
<media:content url="https://example.com/image.jpg" medium="image"/>
<media:thumbnail url="https://example.com/thumb.jpg"/>
```
- Most common in news feeds
- Provides direct image URLs
- May include width/height attributes

#### b. Enclosures
```xml
<enclosure url="https://example.com/image.jpg" type="image/jpeg" length="24816"/>
```
- Standard RSS 2.0 element
- Includes MIME type for validation

#### c. Content/Description Images
```xml
<content:encoded><![CDATA[
  <img src="https://example.com/article-image.jpg" alt="Article" />
  <p>Article text...</p>
]]></content:encoded>
```
- Parse HTML content for `<img>` tags
- Extract first significant image (skip icons, tracking pixels)

#### d. Atom `<link>` with `rel="enclosure"`
```xml
<link rel="enclosure" type="image/jpeg" href="https://example.com/image.jpg"/>
```
- Atom feed standard

### 2. Open Graph Meta Tags
When RSS feed doesn't provide images, scrape the article URL for Open Graph tags:

```html
<meta property="og:image" content="https://example.com/social-image.jpg" />
<meta property="og:image:secure_url" content="https://example.com/social-image.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
```

**Advantages:**
- High quality social media preview images
- Optimized dimensions (typically 1200x630)
- Most modern websites include these

### 3. Twitter Card Meta Tags
Fallback if Open Graph not available:

```html
<meta name="twitter:image" content="https://example.com/twitter-image.jpg" />
<meta name="twitter:card" content="summary_large_image" />
```

### 4. Schema.org `ImageObject`
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "image": {
    "@type": "ImageObject",
    "url": "https://example.com/image.jpg",
    "width": 1200,
    "height": 800
  }
}
</script>
```

### 5. First Significant Image in Page
As last resort, scrape the article page HTML:
- Find `<img>` tags in main content
- Filter out:
  - Icons (< 100x100 pixels)
  - Ads (by class names: 'ad', 'advertisement', 'sponsor')
  - Social media icons
  - Tracking pixels (1x1 images)
- Select first image > 200x200 pixels

## Implementation Approach

### Backend Changes Needed

**1. Update RSS Feed Parser (`backend/app/ingestion/parser.py`)**

Add image extraction logic:

```python
def extract_image_from_entry(entry, article_url):
    """Extract image URL from feed entry or article page."""

    # 1. Check media:content
    if hasattr(entry, 'media_content'):
        for media in entry.media_content:
            if media.get('medium') == 'image':
                return media.get('url')

    # 2. Check media:thumbnail
    if hasattr(entry, 'media_thumbnail'):
        return entry.media_thumbnail[0].get('url')

    # 3. Check enclosures
    if hasattr(entry, 'enclosures'):
        for enclosure in entry.enclosures:
            if enclosure.get('type', '').startswith('image/'):
                return enclosure.get('href') or enclosure.get('url')

    # 4. Parse content for img tags
    content = entry.get('content', [{}])[0].get('value', '') or entry.get('summary', '')
    if content:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content, 'html.parser')
        img = soup.find('img', src=True)
        if img and img['src']:
            # Make absolute URL
            from urllib.parse import urljoin
            return urljoin(article_url, img['src'])

    # 5. Scrape article page (async, in background)
    return None  # Will be filled by scraper task
```

**2. Add Image Scraper Service (`backend/app/services/image_scraper.py`)**

```python
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

def scrape_article_image(url: str) -> str | None:
    """Scrape article page for best image."""
    try:
        response = requests.get(url, timeout=5, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; JotiBot/1.0)'
        })
        soup = BeautifulSoup(response.content, 'html.parser')

        # Priority 1: Open Graph
        og_image = soup.find('meta', property='og:image')
        if og_image and og_image.get('content'):
            return urljoin(url, og_image['content'])

        # Priority 2: Twitter Card
        twitter_image = soup.find('meta', attrs={'name': 'twitter:image'})
        if twitter_image and twitter_image.get('content'):
            return urljoin(url, twitter_image['content'])

        # Priority 3: Schema.org JSON-LD
        schema_script = soup.find('script', type='application/ld+json')
        if schema_script:
            import json
            try:
                data = json.loads(schema_script.string)
                if isinstance(data, dict) and 'image' in data:
                    image = data['image']
                    if isinstance(image, str):
                        return urljoin(url, image)
                    elif isinstance(image, dict) and 'url' in image:
                        return urljoin(url, image['url'])
            except:
                pass

        # Priority 4: First significant image
        for img in soup.find_all('img', src=True):
            src = img['src']
            # Filter out small images, ads, icons
            if any(x in src.lower() for x in ['icon', 'logo', 'avatar', 'ad', 'pixel']):
                continue
            # Check dimensions if available
            width = img.get('width', '').replace('px', '')
            height = img.get('height', '').replace('px', '')
            if width and height:
                try:
                    if int(width) < 200 or int(height) < 200:
                        continue
                except:
                    pass
            return urljoin(url, src)

        return None
    except Exception as e:
        print(f"Failed to scrape image from {url}: {e}")
        return None
```

**3. Add Background Task for Image Scraping**

```python
from celery import shared_task

@shared_task
def fetch_article_image(article_id: int):
    """Background task to scrape article image if not found in feed."""
    from app.models import Article
    from app.services.image_scraper import scrape_article_image
    from app.core.database import SessionLocal

    db = SessionLocal()
    try:
        article = db.query(Article).filter(Article.id == article_id).first()
        if article and not article.image_url and article.url:
            image_url = scrape_article_image(article.url)
            if image_url:
                article.image_url = image_url
                db.commit()
    finally:
        db.close()
```

## Current Implementation Status

✅ **Frontend:**
- Card view layout implemented
- Image display with fallback gradient
- Error handling for broken images
- Responsive grid (1/2/3 columns)

✅ **Database:**
- `Article.image_url` field exists

⏳ **Backend (TODO):**
- RSS feed parser needs image extraction logic
- Open Graph scraper needs implementation
- Background task for delayed scraping
- Image URL validation and sanitization

## Example Feed Sources with Good Images

**Sources that typically include `media:content`:**
1. BleepingComputer - https://www.bleepingcomputer.com/feed/
2. The Hacker News - https://feeds.feedburner.com/TheHackersNews
3. Dark Reading - https://www.darkreading.com/rss.xml
4. SecurityWeek - https://feeds.feedburner.com/securityweek
5. Krebs on Security - https://krebsonsecurity.com/feed/

**Sources that need Open Graph scraping:**
1. SANS ISC - https://isc.sans.edu/rssfeed.xml (minimal RSS)
2. CISA Advisories - https://www.cisa.gov/uscert/ncas/alerts.xml (government, no images)
3. Google Project Zero - https://googleprojectzero.blogspot.com/feeds/posts/default

## Performance Considerations

1. **Caching**: Cache scraped images in CDN or object storage
2. **Rate Limiting**: Limit scraping requests to avoid being blocked
3. **Async Processing**: Don't block article ingestion waiting for images
4. **Fallback**: Always show placeholder/gradient if image unavailable
5. **Image Proxying**: Consider proxying external images through your server for:
   - HTTPS compliance
   - Tracking image load failures
   - Resizing/optimization

## Next Steps

1. ✅ Frontend card view with image support
2. ⏳ Implement RSS feed image extraction
3. ⏳ Implement Open Graph scraper
4. ⏳ Add background task for image fetching
5. ⏳ Test with real feed sources
6. ⏳ Add image caching/proxying layer
