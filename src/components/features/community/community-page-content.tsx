"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { CommunityAdoptPanel } from "@/components/features/community/community-adopt-panel";
import { CommunityBijdragenPanel } from "@/components/features/community/community-bijdragen-panel";

type OuterTab = "overnemen" | "bijdragen";

/**
 * Community: top-level Overnemen | Bijdragen.
 * Default = Overnemen; Bijdragen via `?tab=bijdragen`.
 */
export function CommunityPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const outerTab: OuterTab =
    searchParams.get("tab") === "bijdragen" ? "bijdragen" : "overnemen";

  function setOuterTab(id: OuterTab) {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "overnemen") {
      params.delete("tab");
    } else {
      params.set("tab", "bijdragen");
    }
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }

  const tabButtonClass = (id: OuterTab) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
      outerTab === id
        ? "bg-muted text-foreground"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
    }`;

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Community"
        className="border-border flex flex-wrap gap-2 border-b pb-2"
      >
        <button
          type="button"
          role="tab"
          aria-selected={outerTab === "overnemen"}
          onClick={() => setOuterTab("overnemen")}
          className={tabButtonClass("overnemen")}
        >
          Overnemen
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={outerTab === "bijdragen"}
          onClick={() => setOuterTab("bijdragen")}
          className={tabButtonClass("bijdragen")}
        >
          Bijdragen
        </button>
      </div>

      {outerTab === "overnemen" ? (
        <CommunityAdoptPanel />
      ) : (
        <CommunityBijdragenPanel />
      )}
    </div>
  );
}
