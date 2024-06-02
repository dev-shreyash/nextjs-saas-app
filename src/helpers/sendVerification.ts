import { resend } from "@/lib/resend"
import { ApiResponse } from "@/types/ApiResponse"
import VerificationEmail from "../../verification-email/verificationEmail";
import ReactDOMServer from 'react-dom/server';

export async function sendVerificationEmail(
    email: string,
    username: string,
    verifyCode: string
): Promise<ApiResponse> {
    try {
        console.log("email:", email)
        const reactContent = ReactDOMServer.renderToStaticMarkup(
            VerificationEmail({
                username,
                otp: verifyCode
            })
        );
        const data = await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: 'bhosaleshreyash2@gmail.com',
            subject: 'Fund Your Homie || Veryfcation code',
            react: reactContent
        })
        return { success: true, message: 'successfully sent verification email', data: data }
    } catch (error) {
        console.error("error sending verification email", error);
        return { success: false, message: 'failed to send verification email' }
    }
}
