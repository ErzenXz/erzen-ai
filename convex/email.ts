"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

export const sendVerificationEmail = action({
  args: {
    email: v.string(),
    verificationUrl: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // This is where you would integrate with your email service
    // For example: SendGrid, Resend, AWS SES, etc.

    const welcomeEmailContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Welcome to AI Chatbot App!</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to AI Chatbot App! 🎉</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
            <h2 style="color: #495057; margin-top: 0;">Hi there! 👋</h2>
            
            <p style="font-size: 16px; margin-bottom: 20px;">
              Welcome to our AI-powered chatbot application! We're excited to have you on board. 
              To get started and secure your account, please verify your email address.
            </p>
            
            <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #28a745;">
                ✅ Click the button below to verify your email and activate your account:
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${args.verificationUrl}" 
                 style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); 
                        color: white; 
                        padding: 15px 30px; 
                        text-decoration: none; 
                        border-radius: 25px; 
                        font-weight: bold; 
                        font-size: 16px; 
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                Verify Email Address
              </a>
            </div>
            
            <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #1976d2;">🚀 What you can do once verified:</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Chat with our advanced AI assistant</li>
                <li>Create and manage multiple conversations</li>
                <li>Upload files for AI analysis</li>
                <li>Customize your chat experience</li>
              </ul>
            </div>
            
            <p style="font-size: 14px; color: #6c757d; margin-top: 30px;">
              If you didn't create an account with us, you can safely ignore this email.
            </p>
            
            <p style="font-size: 14px; color: #6c757d;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${args.verificationUrl}" style="color: #007bff; word-break: break-all;">
                ${args.verificationUrl}
              </a>
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; color: #6c757d; font-size: 12px;">
            <p>© 2024 AI Chatbot App. Made with ❤️ for better conversations.</p>
          </div>
        </body>
      </html>
    `;

    // TODO: Replace with actual email service implementation
    // Example with Resend:
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // await resend.emails.send({
    //   from: 'AI Chatbot App <noreply@yourapp.com>',
    //   to: args.email,
    //   subject: 'Welcome! Please verify your email address',
    //   html: welcomeEmailContent,
    // });

    return null;
  },
});
