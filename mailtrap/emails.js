import { sendMail, sender } from "./mailtrap.js";
import { VERIFICATION_EMAIL_TEMPLATE, WELCOME_EMAIL_TEMPLATE , PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE } from "./emailTempalate.js";
import ErrorHandler from "../utils/errorHandler.util.js";

export const sendVerificationEmail = async (email, verificationToken) => {
  try {
    await sendMail({
     
      to: email,
      subject: "Verify your email",
      html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
    });
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
};

export const sendWelcomeEmail = async (email, name) => {
  try {
    await sendMail({
    
      to: email,
      subject: "🎉 Welcome to Your App!",
      html: WELCOME_EMAIL_TEMPLATE.replace("{name}", name),
    });
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
};


export const sendPasswordResetEmail = async (email, resetURL) => {
  try {
    await sendMail({
      to: email,
      subject: "Reset Your Password",
      html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
      category : "password-reset"
    });
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
}

export const sendResetSuccessEmail = async (email) => {
  try {
    await sendMail({
      to: email,
      subject: "Password Reset Successful",
      html: PASSWORD_RESET_SUCCESS_TEMPLATE ,
      
    });
  } catch (error) {
    throw new ErrorHandler(error.message, 500);
  }
}