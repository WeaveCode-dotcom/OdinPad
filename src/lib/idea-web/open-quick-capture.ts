/** Open the Idea Web quick capture dialog (see IdeaWebQuickCaptureHost). */
export function openIdeaWebQuickCapture(): void {
  window.dispatchEvent(new Event("odinpad:idea-web-quick-capture"));
}
