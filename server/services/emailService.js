const { Resend } = require("resend");
const resend = new Resend(process.env.RESEND_API_KEY);

async function SendEmail(email, reset_link) {
    await resend.emails.send(
        {
            from: "onboarding@resend.dev",
            to: email,
                subject: "Reset Your Password",
                html: `
                <h2>Reset Password</h2>

                <p>
                    Click the button below to reset your password.
                </p>

                <a href="${reset_link}">
                    Reset Password
                </a>

                <p>
                    This link expires in 15 minutes.
                </p>
            `
            }
        );
};

module.exports = {SendEmail};
