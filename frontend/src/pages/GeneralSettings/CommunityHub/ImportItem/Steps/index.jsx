import { useEffect, useState } from "react";
import Sidebar from "@/components/SettingsSidebar";
import Introduction from "./Introduction";
import PullAndReview from "./PullAndReview";
import Completed from "./Completed";
import useQuery from "@/hooks/useQuery";

const CommunityHubImportItemSteps = {
  itemId: {
    key: "itemId",
    name: "1. Paste in Item ID",
    next: () => "validation",
    component: ({ settings, setSettings, setStep }) => (
      <Introduction
        settings={settings}
        setSettings={setSettings}
        setStep={setStep}
      />
    ),
  },
  validation: {
    key: "validation",
    name: "2. Review item",
    next: () => "completed",
    component: ({ settings, setSettings, setStep }) => (
      <PullAndReview
        settings={settings}
        setSettings={setSettings}
        setStep={setStep}
      />
    ),
  },
  completed: {
    key: "completed",
    name: "3. Completed",
    component: ({ settings, setSettings, setStep }) => (
      <Completed
        settings={settings}
        setSettings={setSettings}
        setStep={setStep}
      />
    ),
  },
};

export function CommunityHubImportItemLayout({ setStep, children }) {
  const query = useQuery();
  const [settings, setSettings] = useState({
    itemId: null,
    item: null,
  });

  useEffect(() => {
    function autoForward() {
      if (query.get("id")) {
        setSettings({ itemId: query.get("id") });
        setStep(CommunityHubImportItemSteps.itemId.next());
      }
    }
    autoForward();
  }, []);

  return (
    <div className="w-screen h-screen overflow-hidden bg-theme-bg-container flex">
      <Sidebar />
      <div
        style={{ height: "100%" }}
        className="relative w-full h-full overflow-y-scroll p-4 md:p-0"
      >
        {children(settings, setSettings, setStep)}
      </div>
    </div>
  );
}

export default CommunityHubImportItemSteps;
