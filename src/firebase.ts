import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  doc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
export const app = initializeApp(firebaseConfig);

// CRITICAL: getFirestore must pass the firestoreDatabaseId from firebase-applet-config.json
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);

// Initialize Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is in offline mode or emulator is unreachable.');
    }
    return false;
  }
}

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign-in error:', error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
  }
}

export interface SavedAnalysis {
  id?: string;
  datasetName: string;
  totalPosts: number;
  positive: number;
  negative: number;
  neutral: number;
  topKeywords?: Array<{ keyword: string; count: number }>;
  userId: string;
  userEmail?: string;
  createdAt?: any;
  timestamp?: string;
}

export async function saveAnalysisToFirestore(analysisData: Omit<SavedAnalysis, 'userId' | 'createdAt'>): Promise<string> {
  const currentUid = auth.currentUser?.uid || 'guest_user_' + Math.random().toString(36).substring(2, 9);
  const currentEmail = auth.currentUser?.email || 'guest@whitewalkers.local';

  const docPayload = {
    datasetName: analysisData.datasetName || 'Untitled Social Dataset',
    totalPosts: analysisData.totalPosts,
    positive: analysisData.positive,
    negative: analysisData.negative,
    neutral: analysisData.neutral,
    topKeywords: analysisData.topKeywords || [],
    userId: currentUid,
    userEmail: currentEmail,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = await addDoc(collection(db, 'analyses'), docPayload);
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'analyses');
  }
}
