import { DBOS } from "@dbos-inc/dbos-sdk";
import { EventType } from "@shared/events";
import { emit } from "./bus";
import { buildEmailHtml, describeMailError, escapeHtml, sendMail } from "./mailer";

export type InterviewInviteInput = {
  companyUserId: string;
  applicantUserId: string;
  applicantEmail: string;
  jobId: string;
  roomId: string;
  videoCallLink: string;
  scheduledFor: string;
  subject: string;
  message: string;
};

async function emitInviteStatus(
  input: InterviewInviteInput,
  status: "sending" | "sent" | "failed",
  error?: string,
): Promise<void> {
  await emit(
    {
      type: EventType.InterviewInvite,
      userId: input.companyUserId,
      jobId: input.jobId,
      applicantUserId: input.applicantUserId,
      status,
      ...(error ? { error } : {}),
      // Lets the company's applicants page offer a "Join Meeting" button for
      // the same room the candidate was emailed, once delivery succeeds.
      ...(status === "sent"
        ? { roomId: input.roomId, videoCallLink: input.videoCallLink, scheduledFor: input.scheduledFor }
        : {}),
    },
    input.companyUserId,
  );
}

// Sending the invitation can take a minute or more on a slow SMTP path, so it
// runs here rather than inside the HTTP request. Each step is checkpointed, so
// a restart mid-send resumes instead of silently dropping the invitation.
async function interviewInviteWorkflow(input: InterviewInviteInput): Promise<void> {
  await DBOS.runStep(() => emitInviteStatus(input, "sending"), { name: "invite-sending" });

  try {
    await DBOS.runStep(
      () => sendMail({
        to: input.applicantEmail,
        subject: input.subject,
        text: `${input.message}\n\nJoin the video interview: ${input.videoCallLink}`,
        html: buildEmailHtml({
          preheader: input.message.slice(0, 140),
          bodyHtml: `<p style="margin:0 0 8px;">${escapeHtml(input.message).replace(/\n/g, "<br />")}</p>`,
          ctaText: "Join the video interview",
          ctaUrl: input.videoCallLink,
        }),
      }),
      { name: "send-invitation-email", retriesAllowed: false },
    );
  } catch (error) {
    // A failed invitation must not take the process down - report it on the
    // company's event stream and stop.
    console.error("Interview invitation email failed:", error);
    await DBOS.runStep(() => emitInviteStatus(input, "failed", describeMailError(error)), { name: "invite-failed" });
    return;
  }

  // Only tell the applicant once the email is actually accepted by the server.
  await DBOS.runStep(
    () => emit(
      {
        type: EventType.InterviewScheduled,
        userId: input.applicantUserId,
        jobId: input.jobId,
        roomId: input.roomId,
        videoCallLink: input.videoCallLink,
        scheduledFor: input.scheduledFor,
      },
      input.applicantUserId,
    ),
    { name: "interview-scheduled" },
  );
  await DBOS.runStep(() => emitInviteStatus(input, "sent"), { name: "invite-sent" });
}

export const runInterviewInviteWorkflow = DBOS.registerWorkflow(interviewInviteWorkflow, {
  name: "interviewInviteWorkflow",
});
