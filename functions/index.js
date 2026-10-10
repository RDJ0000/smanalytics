/**
 * Firebase Cloud Functions for Social Media Analytics
 * Team: White Walkers
 * Handles validated storage of sentiment analysis reports to Firestore.
 */

const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();
const db = admin.firestore();

/**
 * HTTPS endpoint: saveAnalysis
 * Validates request payload and saves document to 'analyses' collection.
 * Enables CORS for requests from web dashboard (localhost & cloud preview).
 */
exports.saveAnalysis = onRequest({ cors: true }, async (req, res) => {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method Not Allowed. Please send a POST request.",
      receivedMethod: req.method,
    });
  }

  try {
    const { totalPosts, positive, negative, neutral, datasetName, topKeywords, userId } = req.body;

    logger.info("Received saveAnalysis payload", { totalPosts, positive, negative, neutral });

    // 1. Validation: Verify presence and types
    if (
      typeof totalPosts !== "number" ||
      typeof positive !== "number" ||
      typeof negative !== "number" ||
      typeof neutral !== "number"
    ) {
      return res.status(400).json({
        error: "Invalid input: 'totalPosts', 'positive', 'negative', and 'neutral' must all be numbers.",
        received: { totalPosts, positive, negative, neutral },
      });
    }

    // 2. Validation: Non-negative integers
    if (
      totalPosts < 0 ||
      positive < 0 ||
      negative < 0 ||
      neutral < 0 ||
      !Number.isInteger(totalPosts) ||
      !Number.isInteger(positive) ||
      !Number.isInteger(negative) ||
      !Number.isInteger(neutral)
    ) {
      return res.status(400).json({
        error: "Validation failed: Sentiment counts must be non-negative integers.",
        received: { totalPosts, positive, negative, neutral },
      });
    }

    // 3. Mathematical Invariant: positive + negative + neutral === totalPosts
    if (positive + negative + neutral !== totalPosts) {
      return res.status(400).json({
        error: `Validation failed: positive (${positive}) + negative (${negative}) + neutral (${neutral}) must equal totalPosts (${totalPosts}).`,
      });
    }

    // 4. Construct Firestore Document
    const documentData = {
      totalPosts,
      positive,
      negative,
      neutral,
      datasetName: typeof datasetName === "string" ? datasetName.slice(0, 200) : "Social Media Dataset",
      topKeywords: Array.isArray(topKeywords) ? topKeywords.slice(0, 30) : [],
      userId: typeof userId === "string" ? userId : "guest_hackathon_user",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      savedAtISO: new Date().toISOString(),
    };

    const docRef = await db.collection("analyses").add(documentData);

    logger.info("Successfully saved analysis document", { id: docRef.id });

    return res.status(201).json({
      success: true,
      message: "Analysis report successfully saved to Firestore.",
      id: docRef.id,
      data: {
        totalPosts,
        positive,
        negative,
        neutral,
        datasetName: documentData.datasetName,
      },
    });
  } catch (error) {
    logger.error("Error in saveAnalysis:", error);
    return res.status(500).json({
      error: "Internal Server Error while saving analysis to Firestore.",
      details: error.message,
    });
  }
});
