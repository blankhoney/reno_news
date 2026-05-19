"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  feedbackReviewUpdateFromFormData,
  rawEntryLifecycleActionFromFormData,
  setSourceEnabled,
  sourcePolicyUpdateFromFormData,
  triggerSourceIngest,
  updateFeedbackReview,
  updateRawEntryLifecycle,
  updateSourcePolicy
} from "./api";

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

export async function updateSourcePolicyAction(formData: FormData) {
  const sourceId = String(formData.get("sourceId") ?? "");
  const policy = sourcePolicyUpdateFromFormData(formData);

  await updateSourcePolicy(sourceId, policy);
  revalidatePath("/admin");
  revalidatePath(`/admin/sources/${sourceId}`);
  redirect(`/admin/sources/${sourceId}`);
}

export async function updateRawEntryLifecycleAction(formData: FormData) {
  const rawEntryId = String(formData.get("rawEntryId") ?? "");
  const update = rawEntryLifecycleActionFromFormData(formData);

  await updateRawEntryLifecycle(rawEntryId, update);
  revalidatePath("/admin/raw-entries");
  revalidatePath(`/admin/raw-entries/${rawEntryId}`);
  redirect(`/admin/raw-entries/${rawEntryId}`);
}

export async function updateFeedbackReviewAction(formData: FormData) {
  const feedbackId = String(formData.get("feedbackId") ?? "");
  const update = feedbackReviewUpdateFromFormData(formData);

  await updateFeedbackReview(feedbackId, update);
  revalidatePath("/admin/feedback");
  redirect("/admin/feedback");
}
