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

export default function App() {
  const signalEngineEnabled = isSignalEngineUiEnabled(
    import.meta.env.VITE_SIGNAL_ENGINE_ENABLED,
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
