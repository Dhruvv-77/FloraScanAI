import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, where, orderBy, getDocs, deleteDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export interface AnalysisHistoryItem {
  id: string;
  imageUrl: string;
  analysisText: string;
  matchConfidence: number;
  healthScore: number;
  timestamp: Date;
}

export async function saveAnalysis(imageUrl: string, analysisText: string, matchConfidence: number, healthScore: number) {
  if (!auth.currentUser) throw new Error("User must be signed in to save history");

  const path = 'analyses';
  try {
    const docRef = await addDoc(collection(db, path), {
      userId: auth.currentUser.uid,
      imageUrl,
      analysisText,
      matchConfidence,
      healthScore,
      timestamp: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function getAnalysisHistory(): Promise<AnalysisHistoryItem[]> {
  if (!auth.currentUser) return [];

  const path = 'analyses';
  try {
    const q = query(
      collection(db, path),
      where('userId', '==', auth.currentUser.uid),
      orderBy('timestamp', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        imageUrl: data.imageUrl,
        analysisText: data.analysisText,
        matchConfidence: data.matchConfidence,
        healthScore: data.healthScore,
        timestamp: (data.timestamp as Timestamp).toDate()
      };
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function deleteAnalysis(id: string) {
  const path = `analyses/${id}`;
  try {
    await deleteDoc(doc(db, 'analyses', id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function signIn() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Auth Error:", error);
    throw error;
  }
}

export async function signOut() {
  await auth.signOut();
}
