// src/hooks/usePaginatedFetch.ts
//
// Reusable Firestore pagination hook for the Khaja app.
// Implements cursor-based pagination using startAfter() with a
// configurable page size (default 10).
//
// Usage:
//   const { data, loadingInitial, loadingMore, fetchMore, refresh, hasMore } =
//     usePaginatedFetch({ collectionPath: 'orders', constraints: [...], pageSize: 10 });
//
// Features:
// - startAfter() cursor for pages
// - fetchMore() appends next page (call from onEndReached)
// - refresh() resets cursor and reloads first page
// - Caches last cursor in ref to avoid unnecessary re-fetches
// - Uses InteractionManager.runAfterInteractions for initial fetch

import { useCallback, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import {
  collection,
  DocumentData,
  getDocs,
  limit,
  orderBy,
  query,
  QueryConstraint,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db } from '../constants/firebase';

interface UsePaginatedFetchOptions<T> {
  /** Firestore collection path, e.g. 'orders' or 'kitchens/xxx/items' */
  collectionPath: string;
  /** Additional Firestore constraints (where, orderBy, etc.) */
  constraints?: QueryConstraint[];
  /** Number of documents per page. Default 10 */
  pageSize?: number;
  /** Transform a raw Firestore document to your typed object */
  transform?: (doc: DocumentSnapshot<DocumentData>) => T;
}

interface UsePaginatedFetchResult<T> {
  data: T[];
  loadingInitial: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  fetchMore: () => void;
  refresh: () => void;
}

export function usePaginatedFetch<T = DocumentData>({
  collectionPath,
  constraints = [],
  pageSize = 10,
  transform,
}: UsePaginatedFetchOptions<T>): UsePaginatedFetchResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Cursor: last document snapshot for startAfter
  const lastDocRef = useRef<DocumentSnapshot | null>(null);
  // Guard: don't double-fetch
  const isFetchingRef = useRef(false);

  const defaultTransform = useCallback(
    (doc: DocumentSnapshot<DocumentData>): T =>
      ({ id: doc.id, ...doc.data() } as unknown as T),
    [],
  );

  const doFetch = useCallback(
    async (reset: boolean) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (reset) {
        setLoadingInitial(true);
        lastDocRef.current = null;
        setHasMore(true);
      } else {
        if (!hasMore) {
          isFetchingRef.current = false;
          return;
        }
        setLoadingMore(true);
      }

      try {
        const ref = collection(db, collectionPath);
        const builtConstraints: QueryConstraint[] = [
          ...constraints,
          limit(pageSize),
        ];

        if (!reset && lastDocRef.current) {
          builtConstraints.push(startAfter(lastDocRef.current));
        }

        const q = query(ref, ...builtConstraints);
        const snap = await getDocs(q);

        const mapper = transform ?? defaultTransform;
        const newItems = snap.docs.map(mapper);

        if (reset) {
          setData(newItems);
        } else {
          setData((prev) => [...prev, ...newItems]);
        }

        if (snap.docs.length > 0) {
          lastDocRef.current = snap.docs[snap.docs.length - 1];
        }

        setHasMore(snap.docs.length >= pageSize);
      } catch (e) {
        console.error('[usePaginatedFetch] fetch error:', e);
      } finally {
        setLoadingInitial(false);
        setLoadingMore(false);
        isFetchingRef.current = false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [collectionPath, pageSize, transform, defaultTransform, hasMore],
  );

  const fetchInitial = useCallback(() => {
    // Defer non-critical initial load until after interactions settle
    InteractionManager.runAfterInteractions(() => {
      doFetch(true);
    });
  }, [doFetch]);

  const fetchMore = useCallback(() => {
    doFetch(false);
  }, [doFetch]);

  const refresh = useCallback(() => {
    doFetch(true);
  }, [doFetch]);

  return {
    data,
    loadingInitial,
    loadingMore,
    hasMore,
    fetchMore,
    refresh,
  };
}
