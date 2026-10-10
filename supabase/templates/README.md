# Supabase auth email templates

Paste each file into Supabase → Authentication → Emails. `{{ .Token }}`, `{{ .Email }}` and
`{{ .ConfirmationURL }}` are filled in by Supabase.

| Template | Subject | File |
| --- | --- | --- |
| Confirm signup | `Your Sulva Sites code: {{ .Token }}` | `confirm-signup.html` |
| Reset password | `Reset your Sulva Sites password` | `reset-password.html` |

- The sign-up wizard asks for the code (`verifyOtp` type `"signup"`), so "Confirm signup" shows the code, not a link.
- `/forgot-password` calls `resetPasswordForEmail` with a `redirectTo`, so "Reset password" carries the link.
- Email OTP length must be 6 (Authentication → Providers → Email).
- Emails go out through Resend SMTP: host `smtp.resend.com`, port 465, username `resend`, password = Resend API key,
  sender on a domain verified in Resend.
