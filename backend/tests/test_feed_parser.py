from app.ingestion.parser import FeedParser


def test_extract_entries_simple_feed():
    feed = {
        'entries': [
            {
                'id': '1',
                'link': 'http://example.com/1',
                'title': 'Title 1',
                'published': '2020-01-01T00:00:00Z',
                'summary': 'Summary 1'
            }
        ]
    }

    entries = FeedParser.extract_entries(feed)
    assert isinstance(entries, list)
    assert len(entries) == 1
    e = entries[0]
    assert e['external_id'] == '1'
    assert e['title'] == 'Title 1'
    assert e['url'] == 'http://example.com/1'
    assert 'raw_content' in e
