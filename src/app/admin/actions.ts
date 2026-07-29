"use server";

import { revalidatePath } from "next/cache";
import { checkPassword, endAdminSession, isAdmin, startAdminSession } from "@/lib/auth";
import { isProviderId } from "@/lib/concierge/provider";
import { saveSettings } from "@/lib/settings";

export type LoginState = { error?: string };

export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const password = formData.get("password");

  if (typeof password !== "string" || !password) {
    return { error: "Please enter the password." };
  }

  if (!checkPassword(password)) {
    // A small delay takes the edge off online guessing.
    await new Promise((resolve) => setTimeout(resolve, 600));
    return { error: "That password isn't right." };
  }

  await startAdminSession();
  revalidatePath("/admin");
  return {};
}

export async function logout(): Promise<void> {
  await endAdminSession();
  revalidatePath("/admin");
}

export type ProviderState = { error?: string; saved?: boolean };

/**
 * Switches which model answers the concierge.
 *
 * Guarded by the admin session like everything else here — this endpoint
 * decides where guests' questions get sent, so it is not something an
 * unauthenticated caller should be able to flip.
 */
export async function setConciergeProvider(
  _prev: ProviderState,
  formData: FormData,
): Promise<ProviderState> {
  if (!(await isAdmin())) return { error: "Not signed in." };

  const raw = formData.get("provider");
  // "" is the deliberate "no opinion" option: it clears the override and lets
  // the environment decide again.
  const choice = raw === "" ? null : raw;

  if (choice !== null && !isProviderId(choice)) {
    return { error: "Unknown provider." };
  }

  await saveSettings({ conciergeProvider: choice });
  revalidatePath("/admin");
  return { saved: true };
}
