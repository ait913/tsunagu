import { Resend } from "resend";

import { env } from "../env.js";

const resend = new Resend(env.RESEND_API_KEY);

export const sendMail = async (input: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  await resend.emails.send({
    from: env.MAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
};
