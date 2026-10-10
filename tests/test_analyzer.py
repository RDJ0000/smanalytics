"""
Unit Tests for Social Media Sentiment Analyzer
Team: White Walkers
"""

import sys
import os
import unittest

# Ensure backend folder is in Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'backend')))

from analyzer import (
    analyze_sentiment,
    extract_trending_keywords,
    batch_analyze_posts,
    clean_text
)


class TestAnalyzer(unittest.TestCase):

    def test_positive_sentiment(self):
        sample = "The new smartphone display is fantastic and battery life is amazing!"
        result = analyze_sentiment(sample)
        self.assertEqual(result["sentiment"], "Positive")
        self.assertGreater(result["score"], 0)

    def test_negative_sentiment(self):
        sample = "Horrible customer service, the app crashed and my order was delayed. Worst experience!"
        result = analyze_sentiment(sample)
        self.assertEqual(result["sentiment"], "Negative")
        self.assertLess(result["score"], 0)

    def test_neutral_sentiment(self):
        sample = "The press conference will take place tomorrow at 3 PM EST."
        result = analyze_sentiment(sample)
        self.assertEqual(result["sentiment"], "Neutral")

    def test_empty_string(self):
        result = analyze_sentiment("")
        self.assertEqual(result["sentiment"], "Neutral")
        self.assertEqual(result["score"], 0.0)

    def test_negation_handling(self):
        sample = "The customer support was not helpful and definitely not good."
        result = analyze_sentiment(sample)
        self.assertEqual(result["sentiment"], "Negative")

    def test_trending_keywords_stop_words_removed(self):
        posts = [
            "The new camera quality is amazing for photography.",
            "I love the camera and the video speed is fantastic.",
            "Camera lens is clean and crisp."
        ]
        keywords = extract_trending_keywords(posts, top_n=5)
        kw_names = [k["keyword"] for k in keywords]
        self.assertIn("camera", kw_names)
        self.assertNotIn("the", kw_names)
        self.assertNotIn("and", kw_names)
        self.assertNotIn("for", kw_names)

    def test_batch_analyze_sum_invariant(self):
        dataset = [
            {"text": "Loving this update, great job team!"},
            {"text": "Completely broken, total waste of money."},
            {"text": "Meeting scheduled for 10am."},
            {"text": "Awesome battery and fast charging."},
            {"text": "Terrible lag and slow performance."}
        ]
        summary = batch_analyze_posts(dataset)
        self.assertEqual(summary["totalPosts"], 5)
        # Verify the critical sum invariant:
        self.assertEqual(
            summary["positive"] + summary["negative"] + summary["neutral"],
            summary["totalPosts"]
        )
        self.assertEqual(len(summary["posts"]), 5)
        self.assertGreater(len(summary["trendingKeywords"]), 0)


if __name__ == "__main__":
    unittest.main()
