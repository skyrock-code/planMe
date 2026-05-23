/**
 * @file Login.jsx
 * @description Login and Sign Up screen for the PlanMe app.
 *              Toggles between Login and Sign Up modes using local state.
 *              On successful login/register, navigates to the Dashboard.
 *              Matches the login.html design exactly.
 * @module pages
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../context/AuthContext";

// ─── COMPONENT ────────────────────────────────────────────────────────────────

/**
 * Login page component.
 *
 * Handles both Login and Sign Up in one screen using a toggle.
 * Currently uses hardcoded navigation — will connect to Flask
 * JWT auth API in the backend integration phase.
 *
 * @component
 * @returns {JSX.Element}
 */
export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  // ── Form mode: 'login' or 'signup' ──
  const [mode, setMode] = useState("login");

  // ── Form field state ──
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  // Toggle between login and signup modes
  const isSignUp = mode === "signup";

  /**
   * Handles form submission.
   * Placeholder — will call Flask auth API in Phase 4.
   */
  async function handleSubmit() {
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        await register({
          username: fullName,
          email,
          password,
        });
      } else {
        await login({ email, password });
      }
      // AuthProvider handles navigation after successful login/register
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col max-w-[480px] mx-auto overflow-hidden bg-background-light dark:bg-background-dark">

      {/* ── Top App Bar ── */}
      <div className="flex items-center bg-transparent p-4 pb-2 justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
          aria-label="Go back"
        >
          <span className="material-symbols-outlined text-[#111812] dark:text-white">
            chevron_left
          </span>
        </button>

        <h2 className="text-lg font-bold text-[#111812] dark:text-white flex-1 text-center">
          {isSignUp ? "Create Account" : "Welcome"}
        </h2>

        {/* Spacer to balance the back button */}
        <div className="w-10" />
      </div>

      {/* ── Scrollable content area ── */}
      <div className="flex-1 flex flex-col px-6 overflow-y-auto">

        {/* ── Brand logo area ── */}
        <div className="flex justify-center pt-4 pb-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-4xl">
              restaurant_menu
            </span>
          </div>
        </div>

        {/* ── Login / Sign Up toggle switch ── */}
        <div className="flex justify-center pb-6">
          <div className="relative flex items-center p-1 bg-[#dbe6dd] dark:bg-white/10 rounded-full w-full max-w-[280px]">

            {/* Sliding indicator pill */}
            <div
              className={[
                "absolute top-1 h-[calc(100%-8px)] w-[calc(50%-4px)] bg-white dark:bg-primary rounded-full shadow-sm",
                "transition-transform duration-200",
                isSignUp ? "translate-x-[calc(100%+4px)]" : "translate-x-1",
              ].join(" ")}
            />

            {/* Log In tab */}
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
              }}
              className={[
                "relative flex-1 text-center py-2 text-sm font-bold z-10 transition-colors rounded-full",
                !isSignUp ? "text-[#111812]" : "text-[#618968]",
              ].join(" ")}
            >
              Log In
            </button>

            {/* Sign Up tab */}
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
              }}
              className={[
                "relative flex-1 text-center py-2 text-sm font-bold z-10 transition-colors rounded-full",
                isSignUp ? "text-[#111812] dark:text-white" : "text-[#618968]",
              ].join(" ")}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* ── Welcome headline ── */}
        <h1 className="text-[32px] font-bold leading-tight text-center text-[#111812] dark:text-white pb-2 pt-2">
          {isSignUp ? "Create your\naccount!" : "Welcome back,\nBienvenue!"}
        </h1>
        <p className="text-base font-normal leading-normal pb-6 pt-1 text-center text-[#618968]">
          Plan your next meal in seconds.
        </p>

        {/* ── Auth form fields ── */}
        <div className="space-y-4">

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-red-600 text-sm font-medium text-center">{error}</p>
            </div>
          )}

          {/* Full name — Sign Up only */}
          {isSignUp && (
            <Input
              label="Full Name"
              placeholder="Enter your full name"
              type="text"
              shape="pill"
              icon="person"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          )}

          {/* Email field */}
          <Input
            label="Email or Phone Number"
            placeholder="Enter your email or phone"
            type="email"
            shape="pill"
            icon="mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          {/* Password field */}
          <Input
            label="Password"
            placeholder="Enter your password"
            type="password"
            shape="pill"
            icon="lock"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Forgot password — Login only */}
          {!isSignUp && (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot Password?
              </button>
            </div>
          )}

          {/* Submit button */}
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleSubmit}
            className="mt-6"
          >
            {isSignUp ? "Create Account" : "Log In"}
          </Button>
        </div>

        {/* ── Social login divider ── */}
        <div className="flex items-center my-8 gap-4">
          <div className="h-[1px] flex-1 bg-[#dbe6dd] dark:bg-white/10" />
          <span className="text-xs font-bold text-[#618968] uppercase tracking-wider">
            or continue with
          </span>
          <div className="h-[1px] flex-1 bg-[#dbe6dd] dark:bg-white/10" />
        </div>

        {/* ── Social login buttons ── */}
        <div className="flex gap-4">
          {/* Google */}
          <button
            type="button"
            className="flex-1 flex items-center justify-center h-14 border border-[#dbe6dd] dark:border-white/10 rounded-full bg-white dark:bg-white/5 hover:bg-black/5 transition-colors"
            aria-label="Continue with Google"
          >
            <span className="text-sm font-bold text-[#618968]">Google</span>
          </button>

          {/* Apple */}
          <button
            type="button"
            className="flex-1 flex items-center justify-center h-14 border border-[#dbe6dd] dark:border-white/10 rounded-full bg-white dark:bg-white/5 hover:bg-black/5 transition-colors"
            aria-label="Continue with Apple"
          >
            <span className="material-symbols-outlined text-[#111812] dark:text-white">
              phone_iphone
            </span>
          </button>
        </div>
      </div>

      {/* ── Footer toggle link ── */}
      <div className="p-6 text-center">
        <p className="text-base text-[#111812] dark:text-white">
          {isSignUp ? "Already have an account? " : "Don't have an account? "}
          <button
            type="button"
            onClick={() => setMode(isSignUp ? "login" : "signup")}
            className="text-primary font-bold hover:underline"
          >
            {isSignUp ? "Log In" : "Sign Up"}
          </button>
        </p>
        {/* iOS home indicator spacing */}
        <div className="h-8" />
      </div>

      {/* ── Decorative background blobs ── */}
      <div className="absolute -z-10 inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[20%] w-[300px] h-[300px] rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute bottom-[5%] -left-[10%] w-[250px] h-[250px] rounded-full bg-primary/10 blur-[80px]" />
      </div>
    </div>
  );
}
