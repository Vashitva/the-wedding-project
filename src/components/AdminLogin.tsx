"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/actions";

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <div className="mx-auto max-w-sm text-center">
      <p className="eyebrow mb-4">Private</p>
      <h1 className="font-display text-4xl">Replies</h1>

      {!configured ? (
        <div className="card mt-8 p-6 text-left">
          <p className="text-sm text-ink-soft leading-relaxed">
            Set <code className="text-bloom">ADMIN_PASSWORD</code> in{" "}
            <code className="text-bloom">.env.local</code> and restart the server to
            open this dashboard.
          </p>
        </div>
      ) : (
        <form action={formAction} className="mt-8">
          <label htmlFor="password" className="sr-only">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className="field text-center"
            placeholder="Password"
            autoFocus
          />
          {state.error && (
            <p role="alert" className="mt-4 text-sm text-red-700 dark:text-red-400">
              {state.error}
            </p>
          )}
          <button type="submit" disabled={pending} className="btn btn-primary mt-6 w-full">
            {pending ? "Checking…" : "Sign in"}
          </button>
        </form>
      )}
    </div>
  );
}
