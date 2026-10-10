"""
Sentiment Analysis and Keyword Extraction Engine
Team: White Walkers
Project: Social Media Analytics
"""

import re
from collections import Counter
from typing import Dict, List, Tuple, Any

# English Stop Words for meaningful trending keyword extraction
STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are",
    "aren't", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
    "but", "by", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't",
    "doing", "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't",
    "has", "hasn't", "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here",
    "here's", "hers", "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll",
    "i'm", "i've", "if", "in", "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me",
    "more", "most", "mustn't", "my", "myself", "no", "nor", "not", "of", "off", "on", "once",
    "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over", "own", "same",
    "shan't", "she", "she'd", "she'll", "she's", "should", "shouldn't", "so", "some", "such",
    "than", "that", "that's", "the", "their", "theirs", "them", "themselves", "then", "there",
    "there's", "these", "they", "they'd", "they'll", "they're", "they've", "this", "those",
    "through", "to", "too", "under", "until", "up", "very", "was", "wasn't", "we", "we'd",
    "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's", "where",
    "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't",
    "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours",
    "yourself", "yourselves", "rt", "http", "https", "co", "com", "via", "amp", "just", "like", "will"
}

POSITIVE_WORDS = {
    "love", "loved", "loving", "great", "awesome", "fantastic", "excellent", "good", "best",
    "amazing", "perfect", "superb", "brilliant", "wonderful", "delighted", "delightful",
    "happy", "glad", "pleased", "impressed", "positive", "stellar", "terrific", "incredible",
    "cool", "nice", "clean", "smooth", "fast", "helpful", "friendly", "favorite", "enjoyed",
    "enjoy", "recommend", "recommended", "flawless", "win", "winning", "success", "successful",
    "solid", "reliable", "phenomenal", "satisfied", "satisfaction", "top", "worth", "bonus"
}

NEGATIVE_WORDS = {
    "hate", "hated", "hating", "terrible", "awful", "horrible", "bad", "worst", "poor",
    "disappointing", "disappointed", "disappointment", "waste", "rubbish", "trash", "annoying",
    "annoyed", "frustrated", "frustrating", "broken", "buggy", "crash", "crashed", "slow",
    "lag", "laggy", "fail", "failed", "failure", "scam", "fraud", "sucks", "suck", "useless",
    "pathetic", "ridiculous", "glitch", "flaw", "terrible", "inferior", "ugly", "painful",
    "angry", "garbage", "unacceptable", "refund", "delayed", "delay", "problem", "issues", "issue"
}

NEGATION_WORDS = {"not", "no", "never", "hardly", "barely", "scarcely", "cannot", "can't", "won't", "don't", "didn't", "isn't", "wasn't"}
INTENSIFIERS = {"very", "really", "extremely", "super", "absolutely", "incredibly", "totally"}


def clean_text(text: str) -> str:
    """Removes URLs, handles punctuation, and lowercases text."""
    if not text or not isinstance(text, str):
        return ""
    # Remove URLs
    text = re.sub(r"https?://\S+|www\.\S+", "", text)
    # Remove extra spaces
    return text.strip()


def analyze_sentiment(text: str) -> Dict[str, Any]:
    """
    Classifies text sentiment as Positive, Negative, or Neutral.
    Uses lexicon heuristics with negation and intensifier weighting.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return {
            "sentiment": "Neutral",
            "score": 0.0,
            "confidence": 0.5,
            "details": {"positive_matches": [], "negative_matches": []}
        }

    tokens = re.findall(r"\b[a-zA-Z']+\b", cleaned.lower())
    if not tokens:
        return {
            "sentiment": "Neutral",
            "score": 0.0,
            "confidence": 0.5,
            "details": {"positive_matches": [], "negative_matches": []}
        }

    score = 0.0
    pos_matches = []
    neg_matches = []

    for i, token in enumerate(tokens):
        # Check for negation window (up to 2 words back)
        is_negated = False
        multiplier = 1.0

        if i > 0 and tokens[i - 1] in NEGATION_WORDS:
            is_negated = True
        elif i > 1 and tokens[i - 2] in NEGATION_WORDS:
            is_negated = True

        if i > 0 and tokens[i - 1] in INTENSIFIERS:
            multiplier = 1.5

        if token in POSITIVE_WORDS:
            if is_negated:
                score -= 1.2 * multiplier
                neg_matches.append(f"not-{token}")
            else:
                score += 1.0 * multiplier
                pos_matches.append(token)

        elif token in NEGATIVE_WORDS:
            if is_negated:
                score += 0.8 * multiplier
                pos_matches.append(f"not-{token}")
            else:
                score -= 1.0 * multiplier
                neg_matches.append(token)

    if score > 0.3:
        sentiment = "Positive"
        confidence = min(0.95, 0.6 + min(score * 0.1, 0.35))
    elif score < -0.3:
        sentiment = "Negative"
        confidence = min(0.95, 0.6 + min(abs(score) * 0.1, 0.35))
    else:
        sentiment = "Neutral"
        confidence = 0.65

    return {
        "sentiment": sentiment,
        "score": round(score, 2),
        "confidence": round(confidence, 2),
        "details": {
            "positive_matches": pos_matches,
            "negative_matches": neg_matches
        }
    }


def extract_trending_keywords(posts: List[str], top_n: int = 15) -> List[Dict[str, Any]]:
    """
    Extracts high-frequency, non-stopword keywords from a list of post texts.
    """
    words: List[str] = []
    for post in posts:
        cleaned = clean_text(post)
        tokens = re.findall(r"\b[a-zA-Z]{3,}\b", cleaned.lower())
        for token in tokens:
            if token not in STOP_WORDS and token not in NEGATION_WORDS:
                words.append(token)

    counts = Counter(words)
    top = counts.most_common(top_n)
    total_words = max(1, len(words))

    return [
        {
            "keyword": word,
            "count": count,
            "percentage": round((count / total_words) * 100, 1)
        }
        for word, count in top
    ]


def batch_analyze_posts(post_list: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyzes a collection of posts and produces a validated dashboard summary.
    Guarantees: positive + negative + neutral == totalPosts.
    """
    total = len(post_list)
    positive_count = 0
    negative_count = 0
    neutral_count = 0

    analyzed_posts = []
    raw_texts = []

    for idx, item in enumerate(post_list):
        text = item.get("text") or item.get("post") or item.get("content") or item.get("caption") or ""
        raw_texts.append(text)
        result = analyze_sentiment(text)
        sentiment = result["sentiment"]

        if sentiment == "Positive":
            positive_count += 1
        elif sentiment == "Negative":
            negative_count += 1
        else:
            neutral_count += 1

        analyzed_posts.append({
            "id": item.get("id") or item.get("post_id") or str(idx + 1),
            "text": text,
            "author": item.get("author") or item.get("username") or f"user_{idx+1}",
            "sentiment": sentiment,
            "score": result["score"],
            "confidence": result["confidence"],
            "timestamp": item.get("timestamp") or item.get("date") or "2026-10-10"
        })

    # Mathematical Invariant check:
    assert positive_count + negative_count + neutral_count == total

    keywords = extract_trending_keywords(raw_texts, top_n=15)

    return {
        "totalPosts": total,
        "positive": positive_count,
        "negative": negative_count,
        "neutral": neutral_count,
        "sentimentDistribution": {
            "positivePct": round((positive_count / max(1, total)) * 100, 1),
            "negativePct": round((negative_count / max(1, total)) * 100, 1),
            "neutralPct": round((neutral_count / max(1, total)) * 100, 1),
        },
        "trendingKeywords": keywords,
        "posts": analyzed_posts
    }
