"use server";

import { revalidatePath } from "next/cache";
import { checkPassword, endAdminSession, startAdminSession } from "@/lib/auth";

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
