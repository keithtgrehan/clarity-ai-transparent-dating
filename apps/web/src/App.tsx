import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./layouts/AppShell";
import { ChatPage } from "./pages/ChatPage";
import { LandingPage } from "./pages/LandingPage";
import { MatchesPage } from "./pages/MatchesPage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { ProfilePage } from "./pages/ProfilePage";
import { SafetyPage } from "./pages/SafetyPage";
import { SignalReviewPage } from "./pages/SignalReviewPage";
import { isSignalEngineUiEnabled } from "./pages/signalReviewModel";
import { isT1UserDraftUiEnabled } from "./pages/t1UserDraftReviewModel";

const T1UserDraftReviewPage = import.meta.env.DEV
  ? lazy(async () => {
      const page = await import("./pages/T1UserDraftReviewPage");
      return { default: page.T1UserDraftReviewPage };
    })
  : null;

export default function App() {
  const signalEngineEnabled = isSignalEngineUiEnabled(
    import.meta.env.VITE_SIGNAL_ENGINE_ENABLED,
    import.meta.env.DEV
  );
  const t1UserDraftEnabled = isT1UserDraftUiEnabled(
    import.meta.env.VITE_SIGNAL_ENGINE_ENABLED,
    import.meta.env.VITE_SIGNAL_T1_USER_DRAFT_ENABLED,
    import.meta.env.DEV
  );

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<LandingPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/matches" element={<MatchesPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/safety" element={<SafetyPage />} />
        {signalEngineEnabled ? (
          <Route path="/signal-review" element={<SignalReviewPage />} />
        ) : null}
        {import.meta.env.DEV && t1UserDraftEnabled && T1UserDraftReviewPage ? (
          <Route
            path="/signal-review/user-draft"
            element={
              <Suspense fallback={<p className="status-text" role="status">Opening draft scaffold…</p>}>
                <T1UserDraftReviewPage />
              </Suspense>
            }
          />
        ) : null}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
