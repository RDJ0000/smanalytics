import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Upload,
  FileText,
  Search,
  Bot,
  Sparkles,
  ShieldAlert,
  LogIn,
  LogOut,
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Download,
  Flame,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  Atom,
  Terminal,
  Send,
  User as UserIcon,
  ArrowLeft,
  ArrowRight,
  Share2,
  Copy,
  Check,
  X,
  ChevronRight,
  Eye,
  Clock,
  Hash,
  Globe2,
  Layers,
  Bell,
  Link2,
  ShieldCheck,
  Zap,
  Filter,
  Volume2,
  VolumeX,
  Pause,
  Play,
  Radio,
  MapPin,
  Languages,
  Compass,
  FileSpreadsheet
} from 'lucide-react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { auth, db, loginWithGoogle, logoutUser, saveAnalysisToFirestore, SavedAnalysis } from './firebase.ts';

// -------------------------------------------------------------
// Heuristic Stop Words & Sentiment Dictionary
// -------------------------------------------------------------
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are',
  'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but',
  'by', 'can', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours',
  'out', 'over', 'own', 'same', 'she', 'so', 'some', 'such', 'than', 'that', 'the', 'their',
  'theirs', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which',
  'while', 'who', 'whom', 'why', 'with', 'you', 'your', 'yours', 'via', 'http', 'https', 'com'
]);

const POSITIVE_WORDS = new Set([
  'love', 'loved', 'loving', 'great', 'awesome', 'fantastic', 'excellent', 'good', 'best',
  'amazing', 'perfect', 'superb', 'brilliant', 'wonderful', 'delighted', 'delightful',
  'happy', 'glad', 'pleased', 'impressed', 'positive', 'stellar', 'terrific', 'incredible',
  'cool', 'nice', 'clean', 'smooth', 'fast', 'helpful', 'friendly', 'favorite', 'enjoyed',
  'recommend', 'recommended', 'flawless', 'win', 'winning', 'success', 'successful',
  'solid', 'reliable', 'phenomenal', 'satisfied', 'satisfaction', 'top', 'worth', 'bonus',
  'growth', 'promising', 'innovative', 'breakthrough', 'record', 'celebrate', 'gain', 'rally',
  'வெற்றி', 'வளர்ச்சி', 'பாராட்டு', 'சாதனை', 'திறப்பு', 'நன்மை', 'மகிழ்ச்சி'
]);

const NEGATIVE_WORDS = new Set([
  'hate', 'hated', 'hating', 'terrible', 'awful', 'horrible', 'bad', 'worst', 'poor',
  'disappointing', 'disappointed', 'disappointment', 'waste', 'rubbish', 'trash', 'annoying',
  'annoyed', 'frustrated', 'frustrating', 'broken', 'buggy', 'crash', 'crashed', 'slow',
  'lag', 'laggy', 'fail', 'failed', 'failure', 'scam', 'fraud', 'sucks', 'suck', 'useless',
  'pathetic', 'ridiculous', 'glitch', 'flaw', 'inferior', 'ugly', 'painful',
  'angry', 'garbage', 'unacceptable', 'refund', 'delayed', 'delay', 'problem', 'issues', 'issue',
  'warns', 'warning', 'decline', 'drop', 'slump', 'threat', 'breach', 'risk', 'crisis', 'down', 'lawsuit',
  'விபத்து', 'மரண', 'கைது', 'எதிர்ப்பு', 'மோதல்', 'சர்ச்சை', 'பாதிப்பு', 'சரிவு'
]);

const NEGATIONS = new Set(['not', 'no', 'never', 'hardly', 'barely', 'scarcely', 'cannot', "can't", "won't", "don't", "didn't", "isn't", "wasn't"]);

// -------------------------------------------------------------
// Data Interfaces
// -------------------------------------------------------------
export interface NewsArticleItem {
  id: string;
  headline: string;
  summary: string;
  publisher: string;
  url: string;
  imageUrl?: string;
  categories?: string[];
  districtTag?: string;
  publishedAt: string;
  formattedDate: string;
  verificationStatus: 'Official Source' | 'Corroborated' | 'Single Source' | 'Developing';
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  sentimentScore: number;
  isDeveloping: boolean;
  retrievedAt: string;
}

export interface PostItem {
  id: string;
  author: string;
  platform?: string;
  text: string;
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  score: number;
  confidence: number;
  timestamp?: string;
  likes?: number;
  reposts?: number;
  replies?: number;
  url?: string;
  details?: {
    positive_matches: string[];
    negative_matches: string[];
  };
}

export interface TrendingHashtag {
  tag: string;
  count: number;
  growth: string;
  category?: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

// -------------------------------------------------------------
// Tamil Nadu Districts List (All 38 Districts)
// -------------------------------------------------------------
const TN_DISTRICTS = [
  'All Districts',
  'Chennai',
  'Coimbatore',
  'Madurai',
  'Tiruchirapalli',
  'Salem',
  'Tirunelveli',
  'Erode',
  'Tiruppur',
  'Ariyalur',
  'Thanjavur',
  'Kanchipuram',
  'Vellore',
  'Dindigul',
  'Nilgiris',
  'Kanyakumari',
  'Cuddalore',
  'Dharmapuri',
  'Karur',
  'Krishnagiri',
  'Nagapattinam',
  'Namakkal',
  'Perambalur',
  'Pudukkottai',
  'Ramanathapuram',
  'Ranipet',
  'Sivaganga',
  'Tenkasi',
  'Theni',
  'Thoothukudi',
  'Tirupathur',
  'Tiruvallur',
  'Tiruvannamalai',
  'Tiruvarur',
  'Viluppuram',
  'Virudhunagar',
  'Chengalpattu',
  'Kallakurichi',
  'Mayiladuthurai'
];

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<'tamilnadu' | 'worldwide' | 'analytics' | 'advisor' | 'verify' | 'history'>('tamilnadu');

  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Auto-Refresh & Live Update Engine State
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState(60); // 30s, 60s, 120s, 300s
  const [countdown, setCountdown] = useState(60);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [breakingToast, setBreakingToast] = useState<NewsArticleItem | null>(null);
  const [audioMuted, setAudioMuted] = useState(false);

  // Tamil Nadu Dashboard State
  const [tnDistrict, setTnDistrict] = useState<string>('All Districts');
  const [tnCategory, setTnCategory] = useState<string>('all');
  const [tnLanguage, setTnLanguage] = useState<'all' | 'en' | 'ta'>('all');
  const [tnVerification, setTnVerification] = useState<string>('all');
  const [tnArticles, setTnArticles] = useState<NewsArticleItem[]>([]);
  const [tnHashtags, setTnHashtags] = useState<TrendingHashtag[]>([]);
  const [isFetchingTn, setIsFetchingTn] = useState(false);
  const [tnSearchQuery, setTnSearchQuery] = useState('');

  // Worldwide Dashboard State
  const [wwCountry, setWwCountry] = useState<string>('GLOBAL');
  const [wwCategory, setWwCategory] = useState<string>('all');
  const [wwArticles, setWwArticles] = useState<NewsArticleItem[]>([]);
  const [wwHashtags, setWwHashtags] = useState<TrendingHashtag[]>([]);
  const [isFetchingWw, setIsFetchingWw] = useState(false);
  const [wwSearchQuery, setWwSearchQuery] = useState('');

  // Selected Item for Deep Post Details Modal
  const [selectedItem, setSelectedItem] = useState<NewsArticleItem | PostItem | null>(null);
  const [aiPostAnalysis, setAiPostAnalysis] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [scienceVerifyResult, setScienceVerifyResult] = useState<string | null>(null);
  const [isVerifyingClaim, setIsVerifyingClaim] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSpeakingTts, setIsSpeakingTts] = useState(false);

  // White Walkers CSV Analytics State
  const [datasetName, setDatasetName] = useState<string>('Hackathon Social Dataset');
  const [rawPosts, setRawPosts] = useState<any[]>([]);
  const [analyzedPosts, setAnalyzedPosts] = useState<PostItem[]>([]);
  const [totalPosts, setTotalPosts] = useState<number>(0);
  const [positiveCount, setPositiveCount] = useState<number>(0);
  const [negativeCount, setNegativeCount] = useState<number>(0);
  const [neutralCount, setNeutralCount] = useState<number>(0);
  const [trendingKeywords, setTrendingKeywords] = useState<{ keyword: string; count: number; percentage: number }[]>([]);
  const [isSavingToFirestore, setIsSavingToFirestore] = useState(false);
  const [savedFirestoreDocId, setSavedFirestoreDocId] = useState<string | null>(null);
  const [savedReportsList, setSavedReportsList] = useState<SavedAnalysis[]>([]);
  const [csvSearchTerm, setCsvSearchTerm] = useState('');
  const [csvSentimentFilter, setCsvSentimentFilter] = useState<'ALL' | 'Positive' | 'Negative' | 'Neutral'>('ALL');

  // AI Intelligence Advisor (Chatbot) State
  const [chatRole, setChatRole] = useState<'analyst' | 'strategist' | 'crisis'>('analyst');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      content: 'Welcome to the White Walkers Intelligence Center. I analyze real-time social conversations and news developments across Worldwide and Tamil Nadu feeds. Ask me about public sentiment shifts, local governance updates, Kollywood cinema trends, or crisis mitigation.',
      timestamp: 'Just now'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Claim Verifier State
  const [claimInput, setClaimInput] = useState('');
  const [claimAssessment, setClaimAssessment] = useState<{ claim: string; evaluation: string } | null>(null);
  const [isAssessingClaim, setIsAssessingClaim] = useState(false);

  // -------------------------------------------------------------
  // Firebase Auth Listener
  // -------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // -------------------------------------------------------------
  // Firestore Saved Reports Listener
  // -------------------------------------------------------------
  useEffect(() => {
    try {
      const q = query(collection(db, 'analyses'), orderBy('createdAt', 'desc'), limit(15));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: SavedAnalysis[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...(doc.data() as any) });
          });
          setSavedReportsList(list);
        },
        (error) => {
          console.warn('Firestore snapshot notice:', error.message);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore listener setup:', e);
    }
  }, []);

  // -------------------------------------------------------------
  // Speech Synthesis (TTS) Helper
  // -------------------------------------------------------------
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    if (isSpeakingTts) {
      setIsSpeakingTts(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeakingTts(false);
    utterance.onerror = () => setIsSpeakingTts(false);
    setIsSpeakingTts(true);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeakingTts(false);
    }
  };

  // -------------------------------------------------------------
  // Fetch Tamil Nadu Trends
  // -------------------------------------------------------------
  const fetchTamilNaduTrends = async (silent = false) => {
    if (!silent) setIsFetchingTn(true);
    try {
      const distParam = tnDistrict === 'All Districts' ? 'all' : tnDistrict;
      const res = await fetch(`/api/trends/tamilnadu?district=${encodeURIComponent(distParam)}&category=${encodeURIComponent(tnCategory)}&lang=${encodeURIComponent(tnLanguage)}`);
      if (!res.ok) throw new Error('Failed to load Tamil Nadu data');
      const data = await res.json();
      if (data.articles) {
        setTnArticles(data.articles);
        if (data.trendingHashtags) {
          setTnHashtags(data.trendingHashtags);
        }
        setLastSyncTime(new Date().toLocaleTimeString());

        // Check for breaking article
        const newest = data.articles.find((a: NewsArticleItem) => a.isDeveloping);
        if (newest && (!breakingToast || breakingToast.id !== newest.id)) {
          setBreakingToast(newest);
        }
      }
    } catch (err: any) {
      console.error('Fetch TN error:', err);
    } finally {
      setIsFetchingTn(false);
    }
  };

  // -------------------------------------------------------------
  // Fetch Worldwide Trends
  // -------------------------------------------------------------
  const fetchWorldwideTrends = async (silent = false) => {
    if (!silent) setIsFetchingWw(true);
    try {
      const res = await fetch(`/api/trends/worldwide?country=${encodeURIComponent(wwCountry)}&category=${encodeURIComponent(wwCategory)}`);
      if (!res.ok) throw new Error('Failed to load Worldwide data');
      const data = await res.json();
      if (data.articles) {
        setWwArticles(data.articles);
        if (data.trendingHashtags) {
          setWwHashtags(data.trendingHashtags);
        }
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    } catch (err: any) {
      console.error('Fetch Worldwide error:', err);
    } finally {
      setIsFetchingWw(false);
    }
  };

  // Fetch on tab or filter change
  useEffect(() => {
    if (activeTab === 'tamilnadu') {
      fetchTamilNaduTrends();
    } else if (activeTab === 'worldwide') {
      fetchWorldwideTrends();
    }
  }, [activeTab, tnDistrict, tnCategory, tnLanguage, wwCountry, wwCategory]);

  // -------------------------------------------------------------
  // Auto-Refresh Countdown Engine
  // -------------------------------------------------------------
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Trigger refresh
          if (activeTab === 'tamilnadu') {
            fetchTamilNaduTrends(true);
          } else if (activeTab === 'worldwide') {
            fetchWorldwideTrends(true);
          }
          return refreshIntervalSec;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoRefreshEnabled, refreshIntervalSec, activeTab, tnDistrict, tnCategory, tnLanguage, wwCountry, wwCategory]);

  // -------------------------------------------------------------
  // Sentiment Analysis Engine (for Uploaded CSV Datasets)
  // -------------------------------------------------------------
  const analyzeDatasetLocally = (postsToAnalyze: any[]) => {
    let pos = 0;
    let neg = 0;
    let neu = 0;
    const wordFreq: Record<string, number> = {};

    const analyzed: PostItem[] = postsToAnalyze.map((p, idx) => {
      const rawText = String(p.text || p.content || p.tweet || p.headline || '');
      const clean = rawText.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, ' ');
      const tokens = clean.split(/\s+/).filter(Boolean);

      let score = 0;
      const posMatches: string[] = [];
      const negMatches: string[] = [];

      for (let i = 0; i < tokens.length; i++) {
        const word = tokens[i];
        const isNegated = i > 0 && NEGATIONS.has(tokens[i - 1]);

        if (POSITIVE_WORDS.has(word)) {
          if (isNegated) {
            score -= 1.0;
            negMatches.push(`not ${word}`);
          } else {
            score += 1.0;
            posMatches.push(word);
          }
        } else if (NEGATIVE_WORDS.has(word)) {
          if (isNegated) {
            score += 0.5;
            posMatches.push(`not ${word}`);
          } else {
            score -= 1.2;
            negMatches.push(word);
          }
        }

        // Keywords extraction
        if (!STOP_WORDS.has(word) && word.length > 3) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      }

      let sentiment: 'Positive' | 'Negative' | 'Neutral' = 'Neutral';
      if (score >= 0.8) {
        sentiment = 'Positive';
        pos++;
      } else if (score <= -0.6) {
        sentiment = 'Negative';
        neg++;
      } else {
        neu++;
      }

      return {
        id: String(p.id || p.post_id || idx + 1),
        author: String(p.author || p.user || `@user_${idx + 1}`),
        platform: String(p.platform || 'Social Web'),
        text: rawText,
        sentiment,
        score: Number(Math.max(-1, Math.min(1, score / 3)).toFixed(2)),
        confidence: Number((Math.min(1, 0.6 + Math.abs(score) * 0.1)).toFixed(2)),
        timestamp: String(p.timestamp || p.date || new Date().toISOString().split('T')[0]),
        details: {
          positive_matches: posMatches,
          negative_matches: negMatches
        }
      };
    });

    const topK = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([keyword, count]) => ({
        keyword,
        count,
        percentage: Number(((count / Math.max(1, postsToAnalyze.length)) * 100).toFixed(1))
      }));

    setTotalPosts(analyzed.length);
    setPositiveCount(pos);
    setNegativeCount(neg);
    setNeutralCount(neu);
    setAnalyzedPosts(analyzed);
    setTrendingKeywords(topK);
  };

  // CSV File Handler
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDatasetName(file.name.replace('.csv', ''));

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      if (lines.length < 2) return;

      const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const textIdx = headers.findIndex((h) => ['text', 'content', 'tweet', 'headline', 'post'].includes(h));
      const authorIdx = headers.findIndex((h) => ['author', 'user', 'username'].includes(h));
      const platformIdx = headers.findIndex((h) => ['platform', 'source'].includes(h));

      const parsed = lines.slice(1).map((line, idx) => {
        const parts = line.split(',');
        return {
          id: idx + 1,
          text: textIdx !== -1 && parts[textIdx] ? parts[textIdx].replace(/^"|"$/g, '').trim() : line.trim(),
          author: authorIdx !== -1 && parts[authorIdx] ? parts[authorIdx].replace(/^"|"$/g, '').trim() : `@analyst_${idx + 1}`,
          platform: platformIdx !== -1 && parts[platformIdx] ? parts[platformIdx].replace(/^"|"$/g, '').trim() : 'CSV Dataset'
        };
      });

      setRawPosts(parsed);
      analyzeDatasetLocally(parsed);
    };
    reader.readAsText(file);
  };

  // Load Hackathon Sample Dataset
  const loadSampleDataset = async () => {
    setDatasetName('White Walkers Verified Dataset (sample_data.csv)');
    const sample = [
      { id: 1, author: '@tech_insider', platform: 'Twitter', text: 'Just tested the new AI smartphone update. Battery life is fantastic and the screen is super smooth!' },
      { id: 2, author: '@gadget_reviewer', platform: 'YouTube', text: 'Customer support took 4 days to respond and the refund was denied. Worst service experience ever.' },
      { id: 3, author: '@market_watch', platform: 'LinkedIn', text: 'Quarterly financial earnings were published this morning. Revenue meets expectations.' },
      { id: 4, author: '@chennai_dev', platform: 'Reddit', text: 'Chennai tech summit was well organized! Great speakers on Tamil computing and AI infra.' },
      { id: 5, author: '@kollywood_buzz', platform: 'Twitter', text: 'New movie trailer release broke records with 20M views in 24 hours. Incredible direction!' },
      { id: 6, author: '@tn_citizen', platform: 'Twitter', text: 'Heavy rainfall alert issued for delta districts. Waterlogging reported in several areas.' },
      { id: 7, author: '@coimbatore_biz', platform: 'LinkedIn', text: 'Automotive manufacturing output in Kovai hits an all-time high this quarter. Phenomenal growth!' },
      { id: 8, author: '@global_coder', platform: 'HackerNews', text: 'The new open source LLM benchmark shows promising results but documentation is buggy and broken.' },
      { id: 9, author: '@health_tracker', platform: 'Reddit', text: 'Drinking boiled herbal tea relieved mild throat irritation quickly. Natural home remedy works!' },
      { id: 10, author: '@cyber_sec', platform: 'Twitter', text: 'Critical vulnerability detected in old firmware. Security warning issued to update immediately.' }
    ];
    setRawPosts(sample);
    analyzeDatasetLocally(sample);
  };

  // Save Analysis to Firestore
  const handleSaveToFirestore = async () => {
    if (analyzedPosts.length === 0) return;
    setIsSavingToFirestore(true);
    setSavedFirestoreDocId(null);
    try {
      const docId = await saveAnalysisToFirestore({
        datasetName,
        totalPosts,
        positive: positiveCount,
        negative: negativeCount,
        neutral: neutralCount,
        topKeywords: trendingKeywords.map((k) => ({ keyword: k.keyword, count: k.count }))
      });
      setSavedFirestoreDocId(docId);
    } catch (err: any) {
      console.error('Save to Firestore error:', err);
    } finally {
      setIsSavingToFirestore(false);
    }
  };

  // -------------------------------------------------------------
  // AI Deep Intelligence Generator for Selected Post
  // -------------------------------------------------------------
  const handleGenerateAiPostBrief = async (post: NewsArticleItem | PostItem) => {
    setIsGeneratingAi(true);
    setAiPostAnalysis(null);
    try {
      const headline = 'headline' in post ? post.headline : post.text;
      const summary = 'summary' in post ? post.summary : '';
      const publisher = 'publisher' in post ? post.publisher : post.platform;

      const promptText = `Provide a senior strategic intelligence briefing on the following event/post:\n\nTitle/Text: "${headline}"\nContext: "${summary}"\nSource: "${publisher}"\n\nStructure your output as:\n1. Strategic Context & Significance\n2. Public & Community Reaction Analysis\n3. Actionable Key Takeaways`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: promptText }],
          role: 'analyst'
        })
      });

      if (!res.ok) throw new Error('AI analysis service error');
      const data = await res.json();
      setAiPostAnalysis(data.reply || 'Briefing generated.');
    } catch (err: any) {
      setAiPostAnalysis('Unable to generate AI briefing at this moment: ' + err.message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // -------------------------------------------------------------
  // Scientific & Fact Claim Verifier for Selected Post
  // -------------------------------------------------------------
  const handleVerifyPostClaim = async (post: NewsArticleItem | PostItem) => {
    setIsVerifyingClaim(true);
    setScienceVerifyResult(null);
    try {
      const claimText = 'headline' in post ? post.headline : post.text;
      const res = await fetch('/api/science-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claimText })
      });
      if (!res.ok) throw new Error('Verification service error');
      const data = await res.json();
      setScienceVerifyResult(data.evaluation || 'Verification evaluation complete.');
    } catch (err: any) {
      setScienceVerifyResult('Fact verification error: ' + err.message);
    } finally {
      setIsVerifyingClaim(false);
    }
  };

  // -------------------------------------------------------------
  // Chatbot Send Message Handler
  // -------------------------------------------------------------
  const handleSendChatMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userText = chatInput.trim();
    setChatInput('');
    const newHistory: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: userText, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ];
    setChatMessages(newHistory);
    setIsChatLoading(true);

    try {
      let endpoint = '/api/chat';
      let payload: any = {
        messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        role: chatRole
      };

      if (useSearchGrounding) {
        endpoint = '/api/search-trends';
        payload = { query: userText };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('AI Advisor is temporarily unavailable');
      const data = await res.json();

      let replyContent = data.reply || data.summary || 'Insight generated.';
      if (data.sources && Array.isArray(data.sources) && data.sources.length > 0) {
        replyContent += '\n\n**Verified Grounding Sources:**\n' + data.sources.map((s: any) => `• [${s.title}](${s.url})`).join('\n');
      }

      setChatMessages((prev) => [
        ...prev,
        { role: 'model', content: replyContent, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
      ]);
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        { role: 'model', content: 'Notice: ' + err.message, timestamp: 'Now' }
      ]);
    } finally {
      setIsChatLoading(false);
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // -------------------------------------------------------------
  // Standalone Claim Verification Form
  // -------------------------------------------------------------
  const handleAssessStandaloneClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimInput.trim() || isAssessingClaim) return;
    setIsAssessingClaim(true);
    setClaimAssessment(null);
    try {
      const res = await fetch('/api/science-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim: claimInput.trim() })
      });
      if (!res.ok) throw new Error('Verification failed');
      const data = await res.json();
      setClaimAssessment(data);
    } catch (err: any) {
      setClaimAssessment({ claim: claimInput, evaluation: 'Error during evaluation: ' + err.message });
    } finally {
      setIsAssessingClaim(false);
    }
  };

  // Filtered Tamil Nadu Articles
  const filteredTnArticles = useMemo(() => {
    return tnArticles.filter((item) => {
      if (tnVerification !== 'all' && item.verificationStatus !== tnVerification) return false;
      if (tnSearchQuery.trim()) {
        const q = tnSearchQuery.toLowerCase();
        const inHeadline = item.headline.toLowerCase().includes(q);
        const inSummary = item.summary.toLowerCase().includes(q);
        const inPublisher = item.publisher.toLowerCase().includes(q);
        const inDistrict = item.districtTag ? item.districtTag.toLowerCase().includes(q) : false;
        if (!inHeadline && !inSummary && !inPublisher && !inDistrict) return false;
      }
      return true;
    });
  }, [tnArticles, tnVerification, tnSearchQuery]);

  // Filtered Worldwide Articles
  const filteredWwArticles = useMemo(() => {
    return wwArticles.filter((item) => {
      if (wwSearchQuery.trim()) {
        const q = wwSearchQuery.toLowerCase();
        const inHeadline = item.headline.toLowerCase().includes(q);
        const inSummary = item.summary.toLowerCase().includes(q);
        const inPublisher = item.publisher.toLowerCase().includes(q);
        if (!inHeadline && !inSummary && !inPublisher) return false;
      }
      return true;
    });
  }, [wwArticles, wwSearchQuery]);

  // Filtered Analyzed Posts for CSV Table
  const filteredCsvPosts = useMemo(() => {
    return analyzedPosts.filter((p) => {
      if (csvSentimentFilter !== 'ALL' && p.sentiment !== csvSentimentFilter) return false;
      if (csvSearchTerm.trim()) {
        const q = csvSearchTerm.toLowerCase();
        return p.text.toLowerCase().includes(q) || p.author.toLowerCase().includes(q);
      }
      return true;
    });
  }, [analyzedPosts, csvSentimentFilter, csvSearchTerm]);

  // Read Aloud Live Audio Bulletin
  const handleListenBulletin = () => {
    const articles = activeTab === 'tamilnadu' ? filteredTnArticles : filteredWwArticles;
    if (articles.length === 0) return;
    const headlines = articles.slice(0, 4).map((a, idx) => `Update ${idx + 1} from ${a.publisher}: ${a.headline}`).join('. ');
    const bulletin = `White Walkers Live Intelligence Bulletin. Here are the top developing stories right now: ${headlines}. End of bulletin.`;
    speakText(bulletin);
  };

  return (
    <div className="min-h-screen bg-[#070D1E] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ------------------------------------------------------------- */}
      {/* TOP HEADER & WHITE WALKERS BRANDING */}
      {/* ------------------------------------------------------------- */}
      <header className="sticky top-0 z-40 bg-[#0B132B]/90 backdrop-blur-md border-b border-cyan-900/40 px-3 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Logo & Brand Identity */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/40">
                <Flame className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-wider text-base sm:text-lg bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
                    WHITE WALKERS
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950/80 text-cyan-400 border border-cyan-800/60 uppercase tracking-widest">
                    Real-Time Intelligence
                  </span>
                </div>
                <p className="text-xs text-slate-400 hidden sm:block">
                  Worldwide & Tamil Nadu Live Social Media & Verified News Intelligence
                </p>
              </div>
            </div>

            {/* Mobile Refresh Button */}
            <button
              onClick={() => {
                if (activeTab === 'tamilnadu') fetchTamilNaduTrends();
                else if (activeTab === 'worldwide') fetchWorldwideTrends();
                setCountdown(refreshIntervalSec);
              }}
              className="md:hidden p-2 rounded-lg bg-[#1C2541] hover:bg-[#253259] text-cyan-400 border border-cyan-800/40"
              title="Refresh Feed"
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingTn || isFetchingWw ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Live Engine Controls & Auth */}
          <div className="flex items-center flex-wrap gap-2 sm:gap-3 text-xs">
            {/* Auto-Refresh Toggle & Countdown */}
            <div className="flex items-center gap-1.5 bg-[#131D38] border border-cyan-900/60 rounded-xl px-2.5 py-1.5 shadow-inner">
              <button
                onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
                className={`p-1 rounded cursor-pointer transition ${autoRefreshEnabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-400 hover:text-white'}`}
                title={autoRefreshEnabled ? 'Pause Live Updates' : 'Resume Live Updates'}
              >
                {autoRefreshEnabled ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <div className="flex items-center gap-1.5 text-slate-300">
                <span className={`w-2 h-2 rounded-full ${autoRefreshEnabled ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
                <span className="font-mono text-[11px]">
                  {autoRefreshEnabled ? `${countdown}s` : 'Paused'}
                </span>
              </div>

              {/* Interval Selector */}
              <select
                value={refreshIntervalSec}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setRefreshIntervalSec(val);
                  setCountdown(val);
                }}
                className="bg-[#0B132B] border border-cyan-900/40 rounded px-1.5 py-0.5 text-[11px] text-cyan-200 focus:outline-none cursor-pointer"
              >
                <option value={30}>30s</option>
                <option value={60}>1m</option>
                <option value={120}>2m</option>
                <option value={300}>5m</option>
              </select>

              {/* Manual Refresh Now */}
              <button
                onClick={() => {
                  if (activeTab === 'tamilnadu') fetchTamilNaduTrends();
                  else if (activeTab === 'worldwide') fetchWorldwideTrends();
                  setCountdown(refreshIntervalSec);
                }}
                disabled={isFetchingTn || isFetchingWw}
                className="p-1 rounded text-cyan-300 hover:text-white cursor-pointer transition disabled:opacity-50"
                title="Refresh Now"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingTn || isFetchingWw ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Audio Bulletin (TTS) Button */}
            <button
              onClick={handleListenBulletin}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border transition cursor-pointer font-medium ${
                isSpeakingTts
                  ? 'bg-rose-950/80 border-rose-500/60 text-rose-300 animate-pulse'
                  : 'bg-[#131D38] border-cyan-900/60 text-cyan-300 hover:bg-[#1C2541]'
              }`}
              title="Listen to Audio News Summary"
            >
              {isSpeakingTts ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isSpeakingTts ? 'Stop Voice' : 'Listen Bulletin'}</span>
            </button>

            {/* Firebase Auth Account Button */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-[#131D38] border border-cyan-900/50 rounded-xl px-2.5 py-1">
                <span className="w-6 h-6 rounded-full bg-cyan-800 text-cyan-200 flex items-center justify-center font-bold text-[10px]">
                  {currentUser.email ? currentUser.email[0].toUpperCase() : 'U'}
                </span>
                <span className="text-[11px] text-slate-300 max-w-[100px] truncate hidden md:inline">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={logoutUser}
                  className="text-slate-400 hover:text-rose-400 p-1 cursor-pointer transition"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                disabled={authLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium shadow-md shadow-cyan-600/20 cursor-pointer transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* PRIMARY TAB NAVIGATION */}
        {/* ------------------------------------------------------------- */}
        <div className="max-w-7xl mx-auto mt-3 flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1">
          <button
            onClick={() => setActiveTab('tamilnadu')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'tamilnadu'
                ? 'bg-gradient-to-r from-red-600/30 to-amber-600/30 text-amber-200 border border-amber-500/50 shadow-lg shadow-amber-500/10'
                : 'bg-[#0B132B] text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>TAMIL NADU TRENDS</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-400 border border-amber-700/50 font-bold">
              Regional
            </span>
          </button>

          <button
            onClick={() => setActiveTab('worldwide')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'worldwide'
                ? 'bg-gradient-to-r from-cyan-600/30 to-blue-600/30 text-cyan-200 border border-cyan-500/50 shadow-lg shadow-cyan-500/10'
                : 'bg-[#0B132B] text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Globe2 className="w-4 h-4 text-cyan-400" />
            <span>WORLDWIDE TRENDS</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50 font-bold">
              Global
            </span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-indigo-600/30 to-purple-600/30 text-indigo-200 border border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                : 'bg-[#0B132B] text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>WHITE WALKERS ANALYTICS</span>
          </button>

          <button
            onClick={() => setActiveTab('advisor')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'advisor'
                ? 'bg-gradient-to-r from-teal-600/30 to-emerald-600/30 text-teal-200 border border-teal-500/50 shadow-lg shadow-teal-500/10'
                : 'bg-[#0B132B] text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Bot className="w-4 h-4 text-teal-400" />
            <span>AI INTELLIGENCE ADVISOR</span>
          </button>

          <button
            onClick={() => setActiveTab('verify')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'verify'
                ? 'bg-gradient-to-r from-violet-600/30 to-fuchsia-600/30 text-violet-200 border border-violet-500/50 shadow-lg shadow-violet-500/10'
                : 'bg-[#0B132B] text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-violet-400" />
            <span>FACT & CLAIM VERIFIER</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-sky-600/30 to-blue-600/30 text-sky-200 border border-sky-500/50 shadow-lg shadow-sky-500/10'
                : 'bg-[#0B132B] text-slate-400 hover:text-slate-200 border border-transparent'
            }`}
          >
            <Database className="w-4 h-4 text-sky-400" />
            <span>FIRESTORE REPORTS ({savedReportsList.length})</span>
          </button>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* BREAKING NEWS TOAST BANNER */}
      {/* ------------------------------------------------------------- */}
      {breakingToast && (
        <div className="bg-gradient-to-r from-amber-950/90 via-red-950/80 to-amber-950/90 border-b border-amber-600/40 px-4 py-2 flex items-center justify-between text-xs animate-in fade-in">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="flex items-center gap-1 font-bold px-2 py-0.5 rounded bg-amber-500 text-slate-950 uppercase tracking-wider text-[10px]">
                <Flame className="w-3 h-3 animate-bounce" /> DEVELOPING
              </span>
              <span className="font-semibold text-amber-200 truncate">
                {breakingToast.publisher}: {breakingToast.headline}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setSelectedItem(breakingToast);
                  setAiPostAnalysis(null);
                  setScienceVerifyResult(null);
                }}
                className="text-cyan-400 hover:text-cyan-200 underline font-medium cursor-pointer"
              >
                Inspect
              </button>
              <button
                onClick={() => setBreakingToast(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MAIN CONTENT BODY */}
      {/* ------------------------------------------------------------- */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 space-y-6">

        {/* ============================================================= */}
        {/* TAB 1: TAMIL NADU TRENDS DASHBOARD */}
        {/* ============================================================= */}
        {activeTab === 'tamilnadu' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Control Bar: District Selector, Category, Language & Search */}
            <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-400" />
                    Tamil Nadu Regional Intelligence Stream
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time verified state coverage across 38 districts, Kollywood cinema, governance announcements, and community discussions.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Sources: The Hindu, Dinamalar, Polimer, BBC Tamil, Maalai Malar, News18</span>
                </div>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-cyan-900/40">
                {/* District Filter Dropdown */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    District Filter ({TN_DISTRICTS.length})
                  </label>
                  <select
                    value={tnDistrict}
                    onChange={(e) => setTnDistrict(e.target.value)}
                    className="w-full bg-[#131D38] border border-cyan-800/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    {TN_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Topic / Category
                  </label>
                  <select
                    value={tnCategory}
                    onChange={(e) => setTnCategory(e.target.value)}
                    className="w-full bg-[#131D38] border border-cyan-800/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="all">All State Topics</option>
                    <option value="cinema">Kollywood & Cinema</option>
                    <option value="sports">Sports & CSK</option>
                    <option value="education">Education & Exams</option>
                    <option value="weather">Weather & IMD Alerts</option>
                  </select>
                </div>

                {/* Language Toggle */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Language Filter
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[#131D38] p-1 rounded-xl border border-cyan-800/60 text-xs text-center font-medium">
                    <button
                      onClick={() => setTnLanguage('all')}
                      className={`py-1 rounded-lg cursor-pointer transition ${tnLanguage === 'all' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setTnLanguage('en')}
                      className={`py-1 rounded-lg cursor-pointer transition ${tnLanguage === 'en' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => setTnLanguage('ta')}
                      className={`py-1 rounded-lg cursor-pointer transition ${tnLanguage === 'ta' ? 'bg-cyan-600 text-white font-bold' : 'text-slate-400'}`}
                    >
                      தமிழ்
                    </button>
                  </div>
                </div>

                {/* Search in Headlines */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Filter by Keyword
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={tnSearchQuery}
                      onChange={(e) => setTnSearchQuery(e.target.value)}
                      placeholder="Search headline, town, keyword..."
                      className="w-full bg-[#131D38] border border-cyan-800/60 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>

              {/* Quick District Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
                <span className="text-[11px] text-slate-400 uppercase font-semibold shrink-0">Popular:</span>
                {['All Districts', 'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirapalli', 'Salem', 'Tiruppur', 'Ariyalur', 'Thanjavur'].map((d) => (
                  <button
                    key={d}
                    onClick={() => setTnDistrict(d)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg shrink-0 cursor-pointer transition ${
                      tnDistrict === d
                        ? 'bg-amber-600 text-white font-bold shadow'
                        : 'bg-[#131D38] text-slate-300 hover:bg-[#1C2541] border border-cyan-900/40'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Trending Tamil Nadu Hashtags Bar */}
            {tnHashtags.length > 0 && (
              <div className="bg-[#0B132B]/80 border border-cyan-900/40 rounded-2xl p-3 shadow flex items-center gap-2 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 shrink-0 px-2">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>TRENDING HASHTAGS:</span>
                </div>
                {tnHashtags.map((h) => (
                  <button
                    key={h.tag}
                    onClick={() => setTnSearchQuery(h.tag.replace('#', ''))}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#131D38] hover:bg-[#1C2541] border border-cyan-800/40 text-xs shrink-0 cursor-pointer transition"
                  >
                    <span className="text-cyan-300 font-semibold">{h.tag}</span>
                    <span className="text-[10px] text-slate-400">({(h.count / 1000).toFixed(1)}K)</span>
                    <span className="text-[10px] text-emerald-400 font-bold">{h.growth}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Articles Stream Grid */}
            {isFetchingTn && tnArticles.length === 0 ? (
              <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-cyan-200">Retrieving real-time Tamil Nadu intelligence...</p>
                <p className="text-xs text-slate-400">Connecting to Google News, The Hindu, Dinamalar, and native regional RSS wires.</p>
              </div>
            ) : filteredTnArticles.length === 0 ? (
              <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-12 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-white">No articles match your current district or search filter.</p>
                <p className="text-xs text-slate-400">Try selecting "All Districts" or clearing the keyword search box.</p>
                <button
                  onClick={() => {
                    setTnDistrict('All Districts');
                    setTnSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Reset Tamil Nadu Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTnArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => {
                      setSelectedItem(article);
                      setAiPostAnalysis(null);
                      setScienceVerifyResult(null);
                    }}
                    className="group bg-[#0B132B] hover:bg-[#0E1838] border border-cyan-900/60 hover:border-cyan-400/60 rounded-2xl p-4 shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      {/* Top Badges: Publisher, Location & Verification Tier */}
                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <span className="font-bold text-cyan-300 truncate max-w-[130px]">
                          {article.publisher}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {article.districtTag && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60 text-[10px] font-semibold flex items-center gap-1">
                              <MapPin className="w-2.5 h-2.5" /> {article.districtTag}
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              article.verificationStatus === 'Official Source'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                                : article.verificationStatus === 'Developing'
                                ? 'bg-amber-950 text-amber-300 border-amber-700/60 animate-pulse'
                                : 'bg-cyan-950 text-cyan-300 border-cyan-800/60'
                            }`}
                          >
                            {article.verificationStatus}
                          </span>
                        </div>
                      </div>

                      {/* Headline */}
                      <h3 className="font-bold text-white text-sm sm:text-base leading-snug group-hover:text-cyan-200 transition line-clamp-3">
                        {article.headline}
                      </h3>

                      {/* Clean Summary */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {article.summary}
                      </p>
                    </div>

                    {/* Card Footer: Sentiment, Time & Action Buttons */}
                    <div className="pt-3 border-t border-cyan-950 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{article.formattedDate}</span>

                        <span
                          className={`font-semibold ${
                            article.sentiment === 'Positive'
                              ? 'text-emerald-400'
                              : article.sentiment === 'Negative'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          • {article.sentiment}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {/* Audio Speak */}
                        <button
                          onClick={() => speakText(`${article.headline}. ${article.summary}`)}
                          className="p-1.5 rounded-lg bg-[#131D38] hover:bg-[#1C2541] text-slate-400 hover:text-cyan-300 cursor-pointer transition"
                          title="Read Aloud"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Open Original Real URL */}
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 hover:text-white cursor-pointer transition flex items-center gap-1 text-[11px] font-semibold"
                          title="Open Verified Source URL"
                        >
                          <span>Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 2: WORLDWIDE TRENDS DASHBOARD */}
        {/* ============================================================= */}
        {activeTab === 'worldwide' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Control Bar: Country Selector & Categories */}
            <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-4 shadow-xl space-y-4">
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Globe2 className="w-5 h-5 text-cyan-400" />
                    Worldwide Social Media & Global News Pulse
                  </h2>
                  <p className="text-xs text-slate-400">
                    Real-time discussions and top stories from global news wires, Hacker News tech discussions, and international feeds.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span>Covering: Hacker News API, Google News Wire, NDTV Global</span>
                </div>
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-cyan-900/40">
                {/* Country / Region */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Country / Region
                  </label>
                  <select
                    value={wwCountry}
                    onChange={(e) => setWwCountry(e.target.value)}
                    className="w-full bg-[#131D38] border border-cyan-800/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="GLOBAL">Worldwide / Global Wire</option>
                    <option value="US">United States (US)</option>
                    <option value="UK">United Kingdom (UK)</option>
                    <option value="IN">India (National)</option>
                    <option value="EU">European Union (EU)</option>
                    <option value="JP">Japan (JP)</option>
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Global Category
                  </label>
                  <select
                    value={wwCategory}
                    onChange={(e) => setWwCategory(e.target.value)}
                    className="w-full bg-[#131D38] border border-cyan-800/60 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="all">All Global Stories</option>
                    <option value="tech">Technology & AI</option>
                    <option value="business">Business & Economy</option>
                    <option value="entertainment">Entertainment & Cinema</option>
                    <option value="science">Science & Space</option>
                    <option value="sports">World Sports</option>
                  </select>
                </div>

                {/* Keyword Search */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Filter by Keyword
                  </label>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={wwSearchQuery}
                      onChange={(e) => setWwSearchQuery(e.target.value)}
                      placeholder="Search global topic, company, entity..."
                      className="w-full bg-[#131D38] border border-cyan-800/60 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Trending Global Hashtags Bar */}
            {wwHashtags.length > 0 && (
              <div className="bg-[#0B132B]/80 border border-cyan-900/40 rounded-2xl p-3 shadow flex items-center gap-2 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 shrink-0 px-2">
                  <Flame className="w-4 h-4 text-cyan-400" />
                  <span>GLOBAL HASHTAGS:</span>
                </div>
                {wwHashtags.map((h) => (
                  <button
                    key={h.tag}
                    onClick={() => setWwSearchQuery(h.tag.replace('#', ''))}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#131D38] hover:bg-[#1C2541] border border-cyan-800/40 text-xs shrink-0 cursor-pointer transition"
                  >
                    <span className="text-cyan-300 font-semibold">{h.tag}</span>
                    <span className="text-[10px] text-slate-400">({(h.count / 1000).toFixed(1)}K)</span>
                    <span className="text-[10px] text-emerald-400 font-bold">{h.growth}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Articles Stream Grid */}
            {isFetchingWw && wwArticles.length === 0 ? (
              <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-12 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
                <p className="text-sm font-semibold text-cyan-200">Retrieving real-time worldwide feeds...</p>
                <p className="text-xs text-slate-400">Connecting to Hacker News API, Google Global Wire, and verified publishers.</p>
              </div>
            ) : filteredWwArticles.length === 0 ? (
              <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-12 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                <p className="text-sm font-semibold text-white">No articles match your global filter.</p>
                <button
                  onClick={() => {
                    setWwCountry('GLOBAL');
                    setWwSearchQuery('');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold cursor-pointer"
                >
                  Reset Global Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredWwArticles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => {
                      setSelectedItem(article);
                      setAiPostAnalysis(null);
                      setScienceVerifyResult(null);
                    }}
                    className="group bg-[#0B132B] hover:bg-[#0E1838] border border-cyan-900/60 hover:border-cyan-400/60 rounded-2xl p-4 shadow-lg hover:shadow-cyan-500/10 transition-all cursor-pointer flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] gap-2">
                        <span className="font-bold text-cyan-300 truncate max-w-[140px]">
                          {article.publisher}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            article.verificationStatus === 'Corroborated'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-800/60'
                              : 'bg-slate-900 text-slate-300 border-slate-700/60'
                          }`}
                        >
                          {article.verificationStatus}
                        </span>
                      </div>

                      <h3 className="font-bold text-white text-sm sm:text-base leading-snug group-hover:text-cyan-200 transition line-clamp-3">
                        {article.headline}
                      </h3>

                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {article.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-cyan-950 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{article.formattedDate}</span>

                        <span
                          className={`font-semibold ${
                            article.sentiment === 'Positive'
                              ? 'text-emerald-400'
                              : article.sentiment === 'Negative'
                              ? 'text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          • {article.sentiment}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => speakText(`${article.headline}. ${article.summary}`)}
                          className="p-1.5 rounded-lg bg-[#131D38] hover:bg-[#1C2541] text-slate-400 hover:text-cyan-300 cursor-pointer transition"
                          title="Read Aloud"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                        </button>

                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-800/60 text-cyan-300 hover:text-white cursor-pointer transition flex items-center gap-1 text-[11px] font-semibold"
                          title="Open Verified Source"
                        >
                          <span>Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 3: WHITE WALKERS ANALYTICS & CSV DATASET SUITE */}
        {/* ============================================================= */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Card with Dataset Controls */}
            <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-indigo-400" />
                    White Walkers Dataset Sentiment & Keyword Engine
                  </h2>
                  <p className="text-xs text-slate-400">
                    Upload CSV datasets of social media conversations, calculate multi-turn sentiment polarity, and persist reports to Firebase Firestore.
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                  <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload CSV</span>
                    <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                  </label>

                  <button
                    onClick={loadSampleDataset}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#131D38] hover:bg-[#1C2541] border border-cyan-800/60 text-cyan-300 text-xs font-semibold cursor-pointer transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Load sample_data.csv</span>
                  </button>

                  {analyzedPosts.length > 0 && (
                    <button
                      onClick={handleSaveToFirestore}
                      disabled={isSavingToFirestore}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow cursor-pointer transition disabled:opacity-50"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>{isSavingToFirestore ? 'Saving...' : 'Save to Firestore'}</span>
                    </button>
                  )}
                </div>
              </div>

              {savedFirestoreDocId && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/50 flex items-center justify-between text-xs text-emerald-200">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Analysis report successfully saved to Firestore! Document ID: {savedFirestoreDocId}
                  </span>
                  <button
                    onClick={() => setActiveTab('history')}
                    className="underline text-emerald-300 font-semibold cursor-pointer"
                  >
                    View in Firestore Tab
                  </button>
                </div>
              )}
            </div>

            {/* Metrics Overview Cards */}
            {totalPosts > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-4 shadow-lg">
                  <span className="text-xs text-slate-400 block mb-1">Total Posts</span>
                  <div className="text-2xl font-black text-white">{totalPosts}</div>
                  <span className="text-[10px] text-cyan-400">Batch dataset volume</span>
                </div>

                <div className="bg-[#0B132B] border border-emerald-900/60 rounded-2xl p-4 shadow-lg">
                  <span className="text-xs text-emerald-400 block mb-1">Positive Sentiment</span>
                  <div className="text-2xl font-black text-emerald-300">{positiveCount}</div>
                  <span className="text-[10px] text-slate-400">{((positiveCount / totalPosts) * 100).toFixed(1)}% of dataset</span>
                </div>

                <div className="bg-[#0B132B] border border-rose-900/60 rounded-2xl p-4 shadow-lg">
                  <span className="text-xs text-rose-400 block mb-1">Negative Sentiment</span>
                  <div className="text-2xl font-black text-rose-300">{negativeCount}</div>
                  <span className="text-[10px] text-slate-400">{((negativeCount / totalPosts) * 100).toFixed(1)}% of dataset</span>
                </div>

                <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-4 shadow-lg">
                  <span className="text-xs text-slate-300 block mb-1">Neutral Sentiment</span>
                  <div className="text-2xl font-black text-slate-200">{neutralCount}</div>
                  <span className="text-[10px] text-slate-400">{((neutralCount / totalPosts) * 100).toFixed(1)}% of dataset</span>
                </div>
              </div>
            )}

            {/* Trending Keywords Cloud */}
            {trendingKeywords.length > 0 && (
              <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-5 shadow-xl space-y-3">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Hash className="w-4 h-4 text-cyan-400" />
                  Top Extracted Trending Keywords ({trendingKeywords.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {trendingKeywords.map((k) => (
                    <div
                      key={k.keyword}
                      className="px-3 py-1.5 rounded-xl bg-[#131D38] border border-cyan-800/60 flex items-center gap-2 text-xs"
                    >
                      <span className="font-semibold text-cyan-300">#{k.keyword}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-400 font-bold">
                        {k.count} ({k.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Posts Inspection Table */}
            {analyzedPosts.length > 0 && (
              <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-4 shadow-xl space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Dataset Conversations ({filteredCsvPosts.length})
                  </h3>

                  <div className="flex items-center gap-2">
                    {/* Sentiment Filter */}
                    <select
                      value={csvSentimentFilter}
                      onChange={(e) => setCsvSentimentFilter(e.target.value as any)}
                      className="bg-[#131D38] border border-cyan-800/60 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
                    >
                      <option value="ALL">All Sentiments</option>
                      <option value="Positive">Positive</option>
                      <option value="Negative">Negative</option>
                      <option value="Neutral">Neutral</option>
                    </select>

                    {/* Search */}
                    <input
                      type="text"
                      value={csvSearchTerm}
                      onChange={(e) => setCsvSearchTerm(e.target.value)}
                      placeholder="Search text..."
                      className="bg-[#131D38] border border-cyan-800/60 rounded-xl px-3 py-1 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="divide-y divide-cyan-950 max-h-[500px] overflow-y-auto">
                  {filteredCsvPosts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => {
                        setSelectedItem(post);
                        setAiPostAnalysis(null);
                        setScienceVerifyResult(null);
                      }}
                      className="py-3 px-2 hover:bg-[#131D38]/60 rounded-xl cursor-pointer transition flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px]">
                          <span className="font-bold text-cyan-400">{post.author}</span>
                          <span className="text-slate-500">• {post.platform}</span>
                          <span className="text-slate-500">• {post.timestamp}</span>
                        </div>
                        <p className="text-slate-200">{post.text}</p>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            post.sentiment === 'Positive'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
                              : post.sentiment === 'Negative'
                              ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                              : 'bg-slate-900 text-slate-300 border border-slate-700/60'
                          }`}
                        >
                          {post.sentiment} ({post.score})
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 4: AI INTELLIGENCE ADVISOR (CHATBOT) */}
        {/* ============================================================= */}
        {activeTab === 'advisor' && (
          <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-4 sm:p-6 shadow-xl flex flex-col h-[75vh] animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-cyan-900/60 gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Bot className="w-5 h-5 text-teal-400" />
                  White Walkers AI Intelligence Advisor
                </h2>
                <p className="text-xs text-slate-400">
                  Powered by Gemini 3.8 Flash with Google Search Grounding for live worldwide and Tamil Nadu verification.
                </p>
              </div>

              {/* Persona Selector & Grounding Toggle */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setUseSearchGrounding(!useSearchGrounding)}
                  className={`px-2.5 py-1 rounded-xl border transition cursor-pointer font-medium flex items-center gap-1 ${
                    useSearchGrounding
                      ? 'bg-cyan-950 border-cyan-500/80 text-cyan-300 shadow'
                      : 'bg-[#131D38] border-slate-700 text-slate-400'
                  }`}
                  title="Toggle Real-Time Google Search Grounding"
                >
                  <Search className="w-3 h-3" />
                  <span>Search Grounding: {useSearchGrounding ? 'ON' : 'OFF'}</span>
                </button>

                <select
                  value={chatRole}
                  onChange={(e) => setChatRole(e.target.value as any)}
                  className="bg-[#131D38] border border-cyan-800/60 rounded-xl px-2.5 py-1 text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="analyst">Regional Intelligence Analyst</option>
                  <option value="strategist">Senior Media Strategist</option>
                  <option value="crisis">Crisis & Fact-Check Advisor</option>
                </select>
              </div>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-xl bg-teal-600/30 border border-teal-500/60 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-teal-300" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none'
                        : 'bg-[#131D38] text-slate-100 border border-cyan-900/60 rounded-tl-none space-y-2'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className="text-[10px] text-slate-400 text-right">{msg.timestamp}</div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-cyan-700/40 border border-cyan-500/60 flex items-center justify-center shrink-0">
                      <UserIcon className="w-4 h-4 text-cyan-200" />
                    </div>
                  )}
                </div>
              ))}
              {isChatLoading && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 p-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Synthesizing live search intelligence...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Suggested Starter Chips */}
            <div className="py-2 flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
              <span className="text-slate-500 shrink-0 font-semibold">Prompt Starters:</span>
              {[
                'Analyze public reaction to TN infrastructure & transport announcements',
                'What are the top Kollywood cinema trends today?',
                'Summarize global AI breakthroughs discussed on Hacker News',
                'Check rainfall impact in delta districts of Tamil Nadu'
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setChatInput(s);
                  }}
                  className="px-2.5 py-1 rounded-xl bg-[#131D38] hover:bg-[#1C2541] border border-cyan-900/60 text-slate-300 hover:text-white shrink-0 cursor-pointer transition"
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendChatMessage} className="pt-2 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about trending topics, sentiment analysis, or fact checks..."
                className="flex-1 bg-[#131D38] border border-cyan-800/60 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={isChatLoading || !chatInput.trim()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs sm:text-sm font-semibold shadow cursor-pointer transition disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ask AI</span>
              </button>
            </form>
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 5: FACT & CLAIM VERIFIER */}
        {/* ============================================================= */}
        {activeTab === 'verify' && (
          <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-violet-400" />
                Scientific & News Fact Verification Engine
              </h2>
              <p className="text-xs text-slate-400">
                Cross-reference news claims, viral health assertions, or policy rumors against peer-reviewed scientific databases and corroborated journalistic consensus.
              </p>
            </div>

            {/* Input Form */}
            <form onSubmit={handleAssessStandaloneClaim} className="space-y-3">
              <label className="text-xs font-semibold text-slate-300 block">
                Enter News Statement, Medical Assertion, or Social Media Claim:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={claimInput}
                  onChange={(e) => setClaimInput(e.target.value)}
                  placeholder="e.g., 'Drinking boiled herbal concoction prevents respiratory viral infection'"
                  className="flex-1 bg-[#131D38] border border-cyan-800/60 rounded-xl px-4 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                />
                <button
                  type="submit"
                  disabled={isAssessingClaim || !claimInput.trim()}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs sm:text-sm font-bold shadow cursor-pointer transition disabled:opacity-50 flex items-center gap-2 shrink-0"
                >
                  {isAssessingClaim ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>Verify Claim</span>
                </button>
              </div>
            </form>

            {/* Sample Verification Starters */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-slate-400 font-medium">Verify examples:</span>
              {[
                'Tamil Nadu is installing 100MW solar park in Ariyalur district',
                'Drinking lemon water directly cures bacterial throat infections',
                'New generation AI chips operate on 2nm lithography process'
              ].map((ex) => (
                <button
                  key={ex}
                  onClick={() => setClaimInput(ex)}
                  className="px-2.5 py-1 rounded-lg bg-[#131D38] text-slate-300 hover:text-white border border-cyan-900/60 cursor-pointer transition text-[11px]"
                >
                  "{ex.slice(0, 45)}..."
                </button>
              ))}
            </div>

            {/* Result Assessment Card */}
            {claimAssessment && (
              <div className="p-5 rounded-2xl bg-[#131D38] border border-violet-500/40 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-300">
                    Scientific & News Verification Evaluation
                  </span>
                  <button
                    onClick={() => speakText(claimAssessment.evaluation)}
                    className="flex items-center gap-1 text-xs text-cyan-300 hover:text-white cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Listen</span>
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-[#0B132B] border border-cyan-900/50 text-xs font-semibold text-slate-200">
                  Target Claim: "{claimAssessment.claim}"
                </div>

                <div className="text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {claimAssessment.evaluation}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============================================================= */}
        {/* TAB 6: FIRESTORE SAVED REPORTS HISTORY */}
        {/* ============================================================= */}
        {activeTab === 'history' && (
          <div className="bg-[#0B132B] border border-cyan-900/60 rounded-2xl p-5 shadow-xl space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-sky-400" />
                  Firebase Firestore Persistent Analysis Reports
                </h2>
                <p className="text-xs text-slate-400">
                  Real documents stored in Firestore collection <code>analyses</code> with automatic real-time sync.
                </p>
              </div>

              <span className="text-xs px-2.5 py-1 rounded-xl bg-sky-950 text-sky-300 border border-sky-800/50 font-bold">
                {savedReportsList.length} Saved Records
              </span>
            </div>

            {savedReportsList.length === 0 ? (
              <div className="p-10 text-center space-y-2 text-slate-400">
                <Database className="w-8 h-8 mx-auto text-slate-500" />
                <p className="text-sm font-semibold text-slate-300">No saved reports in Firestore yet.</p>
                <p className="text-xs">Head to the "White Walkers Analytics" tab to upload or analyze a dataset and click "Save to Firestore".</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {savedReportsList.map((report) => (
                  <div
                    key={report.id}
                    className="bg-[#131D38] border border-cyan-900/60 rounded-2xl p-4 shadow-lg space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white truncate max-w-[180px]">
                        {report.datasetName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-[#0B132B] p-2 rounded-xl">
                        <span className="text-[10px] text-emerald-400 block">Pos</span>
                        <span className="font-bold text-white">{report.positive}</span>
                      </div>
                      <div className="bg-[#0B132B] p-2 rounded-xl">
                        <span className="text-[10px] text-rose-400 block">Neg</span>
                        <span className="font-bold text-white">{report.negative}</span>
                      </div>
                      <div className="bg-[#0B132B] p-2 rounded-xl">
                        <span className="text-[10px] text-slate-400 block">Total</span>
                        <span className="font-bold text-white">{report.totalPosts}</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 truncate">
                      User: {report.userEmail || report.userId}
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono truncate">
                      Doc ID: {report.id}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------- */}
      {/* DEEP POST DETAILS MODAL / DRAWER */}
      {/* ------------------------------------------------------------- */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-[#070D1E]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-[#0B132B] border border-cyan-500/50 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-[#131D38] border-b border-cyan-900/60 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 rounded-xl bg-[#1C2541] hover:bg-[#253259] text-slate-300 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-white text-sm">
                  Deep Intelligence Inspector • {'publisher' in selectedItem ? selectedItem.publisher : selectedItem.platform}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* TTS Read Aloud */}
                <button
                  onClick={() => {
                    const textToRead = `${'headline' in selectedItem ? selectedItem.headline : selectedItem.text}. ${'summary' in selectedItem ? selectedItem.summary : ''}`;
                    speakText(textToRead);
                  }}
                  className={`p-1.5 rounded-lg border cursor-pointer transition ${
                    isSpeakingTts ? 'bg-rose-950 text-rose-300 border-rose-500' : 'bg-[#1C2541] text-cyan-300 border-cyan-800/40'
                  }`}
                  title="Read Aloud"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-1.5 rounded-lg bg-rose-950/60 text-rose-300 hover:bg-rose-900 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
              {/* Top Meta Strip */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {'districtTag' in selectedItem && selectedItem.districtTag && (
                  <span className="px-2.5 py-1 rounded-full bg-amber-950 text-amber-300 border border-amber-800/60 font-semibold flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {selectedItem.districtTag}
                  </span>
                )}

                {'verificationStatus' in selectedItem && (
                  <span className="px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-bold">
                    {selectedItem.verificationStatus}
                  </span>
                )}

                <span
                  className={`px-2.5 py-1 rounded-full font-bold border ${
                    selectedItem.sentiment === 'Positive'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700/60'
                      : selectedItem.sentiment === 'Negative'
                      ? 'bg-rose-950 text-rose-300 border-rose-700/60'
                      : 'bg-slate-900 text-slate-300 border-slate-700/60'
                  }`}
                >
                  Sentiment: {selectedItem.sentiment} ({'sentimentScore' in selectedItem ? selectedItem.sentimentScore : selectedItem.score})
                </span>

                <span className="text-slate-400 ml-auto flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {'formattedDate' in selectedItem ? selectedItem.formattedDate : selectedItem.timestamp}
                </span>
              </div>

              {/* Headline */}
              <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
                {'headline' in selectedItem ? selectedItem.headline : selectedItem.text}
              </h2>

              {/* Full Description / Summary */}
              {'summary' in selectedItem && selectedItem.summary && (
                <div className="p-4 rounded-xl bg-[#131D38] border border-cyan-900/60 text-slate-200 text-sm leading-relaxed">
                  {selectedItem.summary}
                </div>
              )}

              {/* Primary Direct Navigation Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {'url' in selectedItem && selectedItem.url && (
                  <a
                    href={selectedItem.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-cyan-600/20 cursor-pointer transition"
                  >
                    <span>Open Original Source on {'publisher' in selectedItem ? selectedItem.publisher : 'Platform'}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <button
                  onClick={() => {
                    const link = 'url' in selectedItem && selectedItem.url ? selectedItem.url : window.location.href;
                    navigator.clipboard.writeText(link);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-[#131D38] hover:bg-[#1C2541] border border-cyan-800/60 text-cyan-300 text-xs font-semibold cursor-pointer transition"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              {/* AI Strategic Analysis Generator Button & Output */}
              <div className="pt-3 border-t border-cyan-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    AI Strategic Impact & Key Takeaways
                  </h4>

                  <button
                    onClick={() => handleGenerateAiPostBrief(selectedItem)}
                    disabled={isGeneratingAi}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white text-xs font-bold shadow cursor-pointer transition disabled:opacity-50"
                  >
                    {isGeneratingAi ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                    <span>{isGeneratingAi ? 'Analyzing...' : 'Generate AI Brief'}</span>
                  </button>
                </div>

                {aiPostAnalysis && (
                  <div className="p-4 rounded-xl bg-[#131D38] border border-teal-500/40 text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {aiPostAnalysis}
                  </div>
                )}
              </div>

              {/* Scientific & News Claim Check Button & Output */}
              <div className="pt-2 border-t border-cyan-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-violet-400" />
                    Peer-Reviewed & Fact Verification Check
                  </h4>

                  <button
                    onClick={() => handleVerifyPostClaim(selectedItem)}
                    disabled={isVerifyingClaim}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-xs font-bold shadow cursor-pointer transition disabled:opacity-50"
                  >
                    {isVerifyingClaim ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Atom className="w-3.5 h-3.5" />}
                    <span>{isVerifyingClaim ? 'Verifying...' : 'Fact-Check Claim'}</span>
                  </button>
                </div>

                {scienceVerifyResult && (
                  <div className="p-4 rounded-xl bg-[#131D38] border border-violet-500/40 text-xs sm:text-sm text-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {scienceVerifyResult}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* FOOTER */}
      {/* ------------------------------------------------------------- */}
      <footer className="border-t border-cyan-900/40 bg-[#0B132B] px-4 py-3 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between max-w-7xl mx-auto w-full gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">White Walkers</span>
          <span>• Worldwide & Tamil Nadu Real-Time Trend Intelligence</span>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-slate-500">
          <span>Last Sync: {lastSyncTime || 'Active'}</span>
          <span>Firestore: Connected</span>
          <span>Gemini: 3.8 Flash Ready</span>
        </div>
      </footer>
    </div>
  );
}
