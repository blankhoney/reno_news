"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readerFeedbackFromFormData, submitReaderFeedback } from "../../readerApi";

export async function submitReaderFeedbackAction(formData: FormData) {
  const itemId = String(formData.get("itemId") ?? "");
  const feedback = readerFeedbackFromFormData(formData);

  await submitReaderFeedback(itemId, feedback);
  revalidatePath(`/items/${itemId}`);
  redirect(`/items/${itemId}`);
}
