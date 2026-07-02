"use client";

export type AppTab = "eats" | "journey";

interface TabBarProps {
  activeTab: AppTab;
  onChange: (tab: AppTab) => void;
}

export default function TabBar({ activeTab, onChange }: TabBarProps) {
  return (
    <div className="segmented">
      <button
        type="button"
        className={activeTab === "eats" ? "active" : ""}
        onClick={() => onChange("eats")}
      >
        🍴 Nearby Eats
      </button>
      <button
        type="button"
        className={activeTab === "journey" ? "active" : ""}
        onClick={() => onChange("journey")}
      >
        🗺️ Plan Journey
      </button>
    </div>
  );
}
