"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { setSourceEnabled, triggerSourceIngest } from "./api";

export async function updateSourceEnabledAction(formData: FormData) {
  const sourceId = String(formData.get("sourceId") ?? "");
  const enabled = formData.get("enabled") === "true";

  await setSourceEnabled(sourceId, enabled);
  revalidatePath("/admin");
  revalidatePath(`/admin/sources/${sourceId}`);
  redirect(`/admin/sources/${sourceId}`);
}

export async function triggerSourceIngestAction(formData: FormData) {
  const sourceId = String(formData.get("sourceId") ?? "");

  await triggerSourceIngest(sourceId);
  revalidatePath("/admin/raw-entries");
  redirect(`/admin/sources/${sourceId}`);
}
