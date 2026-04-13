import { useEffect, useState } from "react";
import { db } from "../src/constants/firebase";
import { doc, onSnapshot } from "firebase/firestore";

export function useKitchenTables(kitchenId: string) {
  const [tables, setTables] = useState<any>({});

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "kitchens", kitchenId),
      (snap) => {
        if (snap.exists()) {
          setTables(snap.data().tables || {});
        }
      }
    );

    return () => unsub();
  }, [kitchenId]);

  return tables;
}
