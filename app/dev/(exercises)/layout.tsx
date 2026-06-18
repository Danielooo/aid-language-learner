import { ExerciseToolsTabs } from "./_components/exercise-tools-tabs";

import { DEV_MOCK_USER_USERNAME } from "@/lib/dev/dev-identities";
import { DEV_EXERCISE_TOOLS_REQUIRE_AUTH } from "@/lib/dev/exercise-generator-auth";

import type { ReactNode } from "react";

export default function ExercisesToolsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-6">
      <ExerciseToolsTabs />
      {!DEV_EXERCISE_TOOLS_REQUIRE_AUTH && (
        <p className="text-xs text-muted-foreground">
          Dev-modus · oefeningen worden opgeslagen als{" "}
          <code className="font-mono text-foreground">
            @{DEV_MOCK_USER_USERNAME}
          </code>
        </p>
      )}
      {children}
    </div>
  );
}
