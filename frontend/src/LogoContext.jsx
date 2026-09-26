import { createContext, useEffect, useMemo, useState } from "react";
import MissionLLM from "./media/logo/mission-llm.png";
import MissionLLMDark from "./media/logo/mission-llm-dark.png";
import DefaultLoginLogo from "./media/logo/mission-llm-login.svg";
import System from "./models/system";
import useBranding from "./hooks/useBranding";
import { useTheme } from "./hooks/useTheme";

export const REFETCH_LOGO_EVENT = "refetch-logo";

export const LogoContext = createContext();

/**
 * Logos for the current theme, derived from the instance branding:
 * - `logo`: the custom logo for the current theme (a single uploaded logo
 *   serves both themes), else the bundled Mission LLM logo.
 * - `loginLogo`: the logo on the navy sign-in panel. It prefers the dark theme
 *   logo because that panel is dark in both themes.
 * - `isCustomLogo`: whether an uploaded logo is in use.
 * - `setLogo(url)`: temporary override kept for older callers; cleared when
 *   the saved branding changes.
 *
 * When the server has no branding endpoint, falls back to the legacy
 * /system/logo lookup so an existing custom logo keeps showing.
 */
export function LogoProvider({ children }) {
  const { brand, available, refresh, assetUrl } = useBranding();
  const { isLight } = useTheme();
  const [override, setOverride] = useState(null);
  const [legacyLogo, setLegacyLogo] = useState(null);

  useEffect(() => {
    setOverride(null);
  }, [brand.version]);

  useEffect(() => {
    if (available) {
      setLegacyLogo(null);
      return;
    }
    let active = true;
    System.fetchLogo()
      .then(({ isCustomLogo, logoURL }) => {
        if (active) setLegacyLogo(isCustomLogo && logoURL ? logoURL : null);
      })
      .catch(() => active && setLegacyLogo(null));
    return () => {
      active = false;
    };
  }, [available, isLight]);

  useEffect(() => {
    const onRefetch = () => refresh();
    window.addEventListener(REFETCH_LOGO_EVENT, onRefetch);
    return () => window.removeEventListener(REFETCH_LOGO_EVENT, onRefetch);
  }, [refresh]);

  const value = useMemo(() => {
    const { logoDark, logoLight } = brand.assets;
    const themedPath = isLight
      ? logoLight.url || logoDark.url
      : logoDark.url || logoLight.url;
    const panelPath = logoDark.url || logoLight.url;
    const themed = legacyLogo || assetUrl(themedPath);
    const panel = legacyLogo || assetUrl(panelPath);
    const defaultLogo = isLight ? MissionLLMDark : MissionLLM;

    return {
      logo: override || themed || defaultLogo,
      setLogo: setOverride,
      loginLogo: panel || DefaultLoginLogo,
      isCustomLogo: !!(override || themed),
    };
  }, [brand.assets, isLight, legacyLogo, override, assetUrl]);

  return <LogoContext.Provider value={value}>{children}</LogoContext.Provider>;
}
