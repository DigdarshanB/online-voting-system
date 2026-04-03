import { useEffect, useState } from "react";

const STORAGE_KEY = "dashboard-density";
const DENSITY_COMFORTABLE = "comfortable";
const DENSITY_COMPACT = "compact";

function getInitialDensity() {
  if (typeof window === "undefined" || !window.localStorage) {
    return DENSITY_COMFORTABLE;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === DENSITY_COMFORTABLE || stored === DENSITY_COMPACT) {
    return stored;
  }

  return DENSITY_COMFORTABLE;
}

export default function useDashboardPreferences() {
  const [density, setDensity] = useState(() => getInitialDensity());

  useEffect(() => {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    if (density === DENSITY_COMFORTABLE || density === DENSITY_COMPACT) {
      window.localStorage.setItem(STORAGE_KEY, density);
    }
  }, [density]);

  const toggleDensity = () => {
    setDensity((current) =>
      current === DENSITY_COMPACT ? DENSITY_COMFORTABLE : DENSITY_COMPACT
    );
  };

  return {
    density,
    setDensity,
    toggleDensity,
  };
}
