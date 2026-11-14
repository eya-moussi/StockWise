
"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { getUserRole } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const { access_token } = response.data;

      localStorage.setItem("token", access_token);
      window.dispatchEvent(new Event("auth-change"));

      const role = getUserRole();

      if (!role) {
        localStorage.removeItem("token");
        setError("Unable to retrieve your user role.");
        return;
      }

      localStorage.setItem("role", role);

      router.push("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f4fb] text-[#202033]">
      <div className="relative mx-auto flex min-h-screen max-w-[1500px]">

        {/* LEFT SIDE */}
        <section className="relative hidden w-[55%] flex-col justify-between overflow-hidden border-r border-[#e7e7f0] px-12 py-10 lg:flex xl:px-16">

          {/* Background decoration */}
          <div className="pointer-events-none absolute -left-24 top-1/4 h-[400px] w-[400px] rounded-full bg-[#6d5ef0]/[0.07] blur-[100px]" />
          <div className="pointer-events-none absolute bottom-10 right-0 h-[350px] w-[350px] rounded-full bg-[#a5a0ff]/[0.10] blur-[100px]" />

          {/* Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#6d5ef0] shadow-lg shadow-[#6d5ef0]/20">
              <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
                <path
                  d="M3 21V8.5L12 3L21 8.5V21"
                  stroke="white"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M7 21V12H17V21"
                  stroke="white"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9.5 15H14.5"
                  stroke="white"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <div className="text-[15px] font-bold tracking-[0.18em]">
                STOCKWISE
              </div>
              <div className="mt-0.5 text-[9px] uppercase tracking-[0.24em] text-[#9292a8]">
                Inventory Management
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="relative z-10 -mt-4">
            <div className="mb-5 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                Warehouse control system
              </span>
            </div>

            <h1 className="max-w-[650px] text-[clamp(42px,4.4vw,72px)] font-bold leading-[0.98] tracking-[-0.045em]">
              Keep your stock
              <br />
              <span className="text-[#9999ad]">under control.</span>
            </h1>

            <p className="mt-7 max-w-[510px] text-[15px] leading-7 text-[#77778d]">
              Manage products, warehouses and stock movements from one
              centralized workspace built for everyday operations.
            </p>

            {/* Warehouse illustration */}
            <div className="relative mt-12 h-[300px] w-full max-w-[680px]">

              {/* Floor shadow */}
              <div className="absolute bottom-3 left-[7%] right-[5%] h-10 rounded-full bg-[#c9c9dc]/50 blur-2xl" />

              {/* Warehouse */}
              <div className="absolute bottom-7 left-[5%] right-[5%] h-[220px] overflow-hidden rounded-xl border border-[#dedeea] bg-white shadow-xl shadow-[#34345c]/[0.07]">

                {/* Roof */}
                <div className="absolute left-0 right-0 top-0 h-9 border-b border-[#e9e9f1] bg-[#fafaff]">
                  <div className="flex h-full items-center gap-1.5 px-4">
                    {Array.from({ length: 13 }).map((_, index) => (
                      <span
                        key={index}
                        className="h-1 w-8 rounded-full bg-[#e6e6f0]"
                      />
                    ))}
                  </div>
                </div>

                {/* Left wall */}
                <div className="absolute bottom-0 left-0 top-9 w-[24%] border-r border-[#e9e9f1] bg-[#f7f7fc]">
                  <div className="absolute left-5 top-8 h-24 w-[3px] rounded-full bg-[#6d5ef0]/50" />

                  <div className="absolute left-10 right-5 top-8 space-y-3">
                    <div className="h-2 rounded bg-[#dedeea]" />
                    <div className="h-2 w-2/3 rounded bg-[#e7e7f0]" />
                    <div className="h-2 w-4/5 rounded bg-[#e7e7f0]" />
                  </div>
                </div>

                {/* Main warehouse */}
                <div className="absolute bottom-0 left-[24%] right-0 top-9">

                  {/* Ceiling lights */}
                  <div className="absolute left-[8%] right-[8%] top-6 flex justify-between">
                    <span className="h-1 w-16 rounded-full bg-[#d5d5e5]" />
                    <span className="h-1 w-16 rounded-full bg-[#d5d5e5]" />
                    <span className="h-1 w-16 rounded-full bg-[#d5d5e5]" />
                  </div>

                  {/* Shelf 1 */}
                  <div className="absolute bottom-10 left-[7%] h-[130px] w-[23%]">
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#bfc0d2]" />
                    <div className="absolute bottom-[42px] left-0 right-0 h-1 bg-[#bfc0d2]" />
                    <div className="absolute bottom-[84px] left-0 right-0 h-1 bg-[#bfc0d2]" />
                    <div className="absolute bottom-0 left-1 h-full w-[2px] bg-[#d5d5e2]" />
                    <div className="absolute bottom-0 right-1 h-full w-[2px] bg-[#d5d5e2]" />

                    <div className="absolute bottom-[49px] left-3 h-7 w-9 rounded-sm border border-[#e2d8ff] bg-[#e8e1ff]" />
                    <div className="absolute bottom-[49px] left-14 h-7 w-7 rounded-sm border border-[#d1eee0] bg-[#e0f5eb]" />
                    <div className="absolute bottom-[91px] left-4 h-7 w-6 rounded-sm bg-[#e2eaff]" />
                    <div className="absolute bottom-[91px] left-11 h-7 w-10 rounded-sm bg-[#fff0d6]" />
                    <div className="absolute bottom-[7px] left-5 h-7 w-8 rounded-sm bg-[#ececf4]" />
                    <div className="absolute bottom-[7px] left-16 h-7 w-6 rounded-sm bg-[#ececf4]" />
                  </div>

                  {/* Shelf 2 */}
                  <div className="absolute bottom-10 left-[35%] h-[130px] w-[23%]">
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#bfc0d2]" />
                    <div className="absolute bottom-[42px] left-0 right-0 h-1 bg-[#bfc0d2]" />
                    <div className="absolute bottom-[84px] left-0 right-0 h-1 bg-[#bfc0d2]" />
                    <div className="absolute bottom-0 left-1 h-full w-[2px] bg-[#d5d5e2]" />
                    <div className="absolute bottom-0 right-1 h-full w-[2px] bg-[#d5d5e2]" />

                    <div className="absolute bottom-[49px] left-3 h-7 w-8 rounded-sm bg-[#e2eaff]" />
                    <div className="absolute bottom-[49px] left-14 h-7 w-9 rounded-sm bg-[#fff0d6]" />
                    <div className="absolute bottom-[91px] left-5 h-7 w-10 rounded-sm bg-[#e0f5eb]" />
                    <div className="absolute bottom-[91px] left-16 h-7 w-6 rounded-sm bg-[#ececf4]" />
                  </div>

                  {/* Loading door */}
                  <div className="absolute bottom-0 right-[6%] h-[150px] w-[25%] border-x border-t border-[#e0e0ec] bg-[#f6f6fc]">
                    <div className="absolute inset-x-3 top-3 h-[2px] bg-[#e3e3ed]" />
                    <div className="absolute inset-x-3 top-9 h-[2px] bg-[#e3e3ed]" />
                    <div className="absolute inset-x-3 top-[63px] h-[2px] bg-[#e3e3ed]" />
                    <div className="absolute inset-x-3 top-[87px] h-[2px] bg-[#e3e3ed]" />
                    <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-[#e3e3ed]" />
                    <div className="absolute bottom-0 left-1/2 h-1 w-12 -translate-x-1/2 rounded-t bg-[#6d5ef0]/40" />
                  </div>

                  {/* Floor */}
                  <div className="absolute bottom-4 left-0 right-0 h-px bg-[#e5e5ef]" />
                </div>
              </div>

              {/* Inventory card */}
              <div className="absolute left-[1%] top-[8%] w-[190px] rounded-xl border border-[#e8e7f2] bg-white p-4 shadow-xl shadow-[#34345c]/[0.08] transition duration-500 hover:-translate-y-2 hover:border-[#6d5ef0]/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9999ad]">
                    Inventory
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </div>

                <div className="mt-3 flex items-end justify-between">
                  <span className="text-2xl font-bold tracking-tight text-[#25253b]">
                    98.4%
                  </span>
                  <span className="mb-1 text-[10px] font-medium text-emerald-600">
                    accurate
                  </span>
                </div>

                <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#ededf5]">
                  <div className="h-full w-[84%] rounded-full bg-[#6d5ef0]" />
                </div>
              </div>

              {/* Movement card */}
              <div className="absolute bottom-[-3%] right-[2%] w-[205px] rounded-xl border border-[#e8e7f2] bg-white p-4 shadow-xl shadow-[#34345c]/[0.08] transition duration-500 hover:-translate-y-2 hover:border-[#6d5ef0]/30">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#9999ad]">
                    Stock movement
                  </span>

                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M5 12H19"
                      stroke="#6d5ef0"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                    />
                    <path
                      d="M13 6L19 12L13 18"
                      stroke="#6d5ef0"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#6d5ef0]/10">
                    <span className="text-sm font-semibold text-[#6d5ef0]">↗</span>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[#44445c]">
                      Incoming
                    </div>
                    <div className="text-[10px] text-[#a1a1b3]">
                      Updated just now
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 flex items-center justify-between border-t border-[#e5e5ef] pt-5 text-[10px] font-medium uppercase tracking-[0.15em] text-[#a3a3b5]">
            <span>Secure workspace</span>
            <span>StockWise © 2026</span>
          </div>
        </section>

        {/* RIGHT SIDE */}
        <section className="flex w-full items-center justify-center px-6 py-10 sm:px-10 lg:w-[45%] lg:px-14 xl:px-20">
          <div className="w-full max-w-[430px]">

            {/* Mobile logo */}
            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#6d5ef0] shadow-lg shadow-[#6d5ef0]/20">
                <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 21V8.5L12 3L21 8.5V21"
                    stroke="white"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7 21V12H17V21"
                    stroke="white"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M9.5 15H14.5"
                    stroke="white"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div>
                <div className="text-[15px] font-bold tracking-[0.18em]">
                  STOCKWISE
                </div>
                <div className="text-[9px] uppercase tracking-[0.24em] text-[#9292a8]">
                  Inventory Management
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-9">
              <div className="mb-4 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#6d5ef0]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6d5ef0]">
                  Access portal
                </span>
              </div>

              <h2 className="text-3xl font-bold tracking-[-0.035em] text-[#202033] sm:text-[36px]">
                Welcome back.
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#89899e]">
                Sign in to access your inventory workspace.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-5">

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#66667d]"
                >
                  Email address
                </label>

                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-[#aaaabc] transition-colors group-focus-within:text-[#6d5ef0]"
                    >
                      <path
                        d="M4 6H20V18H4V6Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M4 7L12 13L20 7"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    placeholder="you@company.com"
                    className="h-14 w-full rounded-xl border border-[#e3e3ed] bg-white pl-12 pr-4 text-sm text-[#25253b] outline-none transition-all placeholder:text-[#b7b7c7] hover:border-[#c9c5ed] focus:border-[#6d5ef0] focus:shadow-[0_0_0_3px_rgba(109,94,240,0.10)]"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-[#66667d]"
                >
                  Password
                </label>

                <div className="group relative">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-[#aaaabc] transition-colors group-focus-within:text-[#6d5ef0]"
                    >
                      <rect
                        x="5"
                        y="10"
                        width="14"
                        height="10"
                        rx="2"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M8 10V7.5C8 5.29 9.79 3.5 12 3.5C14.21 3.5 16 5.29 16 7.5V10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError("");
                    }}
                    placeholder="Enter your password"
                    className="h-14 w-full rounded-xl border border-[#e3e3ed] bg-white pl-12 pr-12 text-sm text-[#25253b] outline-none transition-all placeholder:text-[#b7b7c7] hover:border-[#c9c5ed] focus:border-[#6d5ef0] focus:shadow-[0_0_0_3px_rgba(109,94,240,0.10)]"
                  />

                  {/* Show / hide password */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-[#aaaabc] transition-colors hover:text-[#6d5ef0]"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M3 3L21 21"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.6 10.7C10.23 11.05 10 11.5 10 12C10 13.1 10.9 14 12 14C12.5 14 12.95 13.77 13.3 13.4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M9.88 5.2C10.56 5.06 11.27 5 12 5C17.5 5 21 12 21 12C21 12 19.55 14.9 17 16.7"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M6.3 6.3C4.15 7.9 3 12 3 12C3 12 6.5 19 12 19C13.1 19 14.14 18.78 15.1 18.4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path
                          d="M2.5 12C2.5 12 6 5 12 5C18 5 21.5 12 21.5 12C21.5 12 18 19 12 19C6 19 2.5 12 2.5 12Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="shrink-0"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    />
                    <path
                      d="M12 8V12"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="16" r="0.8" fill="currentColor" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Login button */}
              <button
                type="submit"
                disabled={loading}
                className="group relative mt-2 flex h-14 w-full items-center justify-center overflow-hidden rounded-xl bg-[#6d5ef0] text-sm font-semibold text-white shadow-lg shadow-[#6d5ef0]/20 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#5b4be0] hover:shadow-xl hover:shadow-[#6d5ef0]/25 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <span className="relative flex items-center gap-3">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Signing in...
                  </span>
                ) : (
                  <span className="relative flex items-center gap-2">
                    Sign in
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="transition-transform duration-200 group-hover:translate-x-1"
                    >
                      <path
                        d="M5 12H19"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                      <path
                        d="M13 6L19 12L13 18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                )}
              </button>
            </form>

            {/* Security note */}
            <div className="mt-8 flex items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-[0.15em] text-[#aaaabc]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <rect
                  x="5"
                  y="10"
                  width="14"
                  height="10"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path
                  d="M8 10V7.5C8 5.29 9.79 3.5 12 3.5C14.21 3.5 16 5.29 16 7.5V10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
              Secure access
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
