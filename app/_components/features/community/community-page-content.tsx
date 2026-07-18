"use client";

import { useState } from "react";

import { CommunityAdoptPanel } from "@/app/_components/features/community/community-adopt-panel";
import { CommunityBijdragenPanel } from "@/app/_components/features/community/community-bijdragen-panel";

type OuterTab = "bijdragen" | "overnemen";

/**
 * Community: top-level Bijdragen | Overnemen.
 */
export function CommunityPageContent() {
  const [outerTab, setOuterTab] = useState<OuterTab>("bijdragen");

  const tabButtonClass = (id: OuterTab) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      outerTab === id
        ? "bg-accent text-accent-foreground"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Community"
        className="flex flex-wrap gap-2 border-b border-border pb-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={outerTab === "bijdragen"}
          onClick={() => setOuterTab("bijdragen")}
          className={tabButtonClass("bijdragen")}
        >
          Bijdragen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={outerTab === "overnemen"}
          onClick={() => setOuterTab("overnemen")}
          className={tabButtonClass("overnemen")}
        >
          Overnemen
        </button>
      </div>

      {outerTab === "bijdragen" ? (
        <CommunityBijdragenPanel />
      ) : (
        <CommunityAdoptPanel />
      )}
    </div>
  );
}
