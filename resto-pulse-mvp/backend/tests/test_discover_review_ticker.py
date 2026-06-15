from app.services.discover_review_ticker import review_snippet


def test_review_snippet_truncates_to_five_words() -> None:
    assert review_snippet("pideli köfte gerçekten çok güzel ve taze") == "pideli köfte gerçekten çok güzel…"


def test_review_snippet_keeps_short_text() -> None:
    assert review_snippet("harika bir deneyim") == "harika bir deneyim"
