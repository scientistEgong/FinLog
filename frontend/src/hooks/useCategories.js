// Share category loading and retry behavior across screens that need category choices.
import { useCallback, useEffect, useState } from "react";
import { listCategories } from "../api/categories.js";

export default function useCategories() {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setCategories(await listCategories());
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { categories, error, reload };
}
