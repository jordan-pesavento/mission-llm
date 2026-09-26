import { useEffect, useState } from "react";
import UserButton, { useRailUserMounted } from "./UserButton";

export { RailUser } from "./UserButton";

/**
 * Wraps every signed-in page. The user menu itself lives in the rail foot
 * (RailUser); the floating button only appears on pages that have no rail.
 * The short delay keeps it from flashing while a page with a rail loads.
 */
export default function UserMenu({ children }) {
  const railUserMounted = useRailUserMounted();
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (railUserMounted) {
      setShowFallback(false);
      return;
    }
    const timer = setTimeout(() => setShowFallback(true), 800);
    return () => clearTimeout(timer);
  }, [railUserMounted]);

  return (
    <div className="w-auto h-auto">
      {showFallback && !railUserMounted && <UserButton />}
      {children}
    </div>
  );
}
