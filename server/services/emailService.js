const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function SendEmail(email, link, type = "reset") {
    const isInvite = type === "agent_invite";

    const subject = isInvite
        ? "You're Invited to Join SupportIQ as an Agent"
        : "Reset Your Password";

    const html = isInvite
        ? `
            <h2>Welcome to SupportIQ!</h2>
            <p>
                You've been invited to join the SupportIQ support team as an agent.
                Click the button below to set up your account.
            </p>
            <a href="${link}" style="display:inline-block;padding:12px 24px;background:#4a90e2;color:white;text-decoration:none;border-radius:8px;font-weight:bold;">
                Accept Invite & Set Up Account
            </a>
            <p>This link expires in 48 hours.</p>
        `
        : `
            <h2>Reset Password</h2>
            <p>
                Click the button below to reset your password.
            </p>
            <a href="${link}">
                Reset Password
            </a>
            <p>
                This link expires in 15 minutes.
            </p>
        `;

    await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject,
        html
    });
}

module.exports = { SendEmail };

