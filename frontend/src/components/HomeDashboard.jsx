import { useEffect, useState } from "react";
import DesktopHomeDashboard from "./DesktopHomeDashboard";
import MobileHomeDashboard from "./MobileHomeDashboard";

function getIsMobile() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 900px)").matches;
}

function HomeDashboard(props) {
  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 900px)");
    const update = (event) => setIsMobile(event.matches);
    setIsMobile(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  return isMobile
    ? <MobileHomeDashboard {...props} />
    : <DesktopHomeDashboard {...props} />;
}

export default HomeDashboard;
