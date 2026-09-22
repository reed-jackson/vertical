import { ArrowRight, LockKeyhole } from "lucide-react";
import {
  ALLOWED_EMAIL,
  chatGPTSignInPath,
  chatGPTSignOutPath,
  type ChatGPTUser,
} from "@/app/chatgpt-auth";

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.35l-3.24-2.55c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.63A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.44H3.04A10 10 0 0 0 2 12c0 1.64.39 3.19 1.04 4.56l3.35-2.63Z" />
      <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.88A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.44l3.35 2.63C7.18 7.7 9.39 5.94 12 5.94Z" />
    </svg>
  );
}

export function SignInGate({ user }: { user: ChatGPTUser | null }) {
  const wrongAccount = Boolean(user);

  return (
    <main className="auth-shell">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand" aria-hidden="true">V</div>
        <div className="auth-copy">
          <h1 id="auth-title">Your days, kept private.</h1>
          <p>
            {wrongAccount
              ? `This calendar only opens for ${ALLOWED_EMAIL}.`
              : "Sign in to open your personal calendar."}
          </p>
        </div>

        {wrongAccount ? (
          <a className="auth-button" href={chatGPTSignOutPath("/")}>
            <span>Use another Google account</span>
            <ArrowRight size={17} aria-hidden="true" />
          </a>
        ) : (
          <a className="auth-button" href={chatGPTSignInPath("/")}>
            <GoogleMark />
            <span>Sign in with Google</span>
            <ArrowRight className="auth-button-arrow" size={17} aria-hidden="true" />
          </a>
        )}

        <p className="auth-private"><LockKeyhole size={13} aria-hidden="true" /> Only {ALLOWED_EMAIL} has access</p>
      </section>
    </main>
  );
}
