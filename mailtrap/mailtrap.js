
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,      // your gmail address
    pass: process.env.GMAIL_PASS,      // your app password from google
  },
});

export const sender = {
  email: process.env.GMAIL_USER,
  name: "Aditya Raman",
};

export const sendMail = async ({ to, subject, html }) => {
  const info = await transporter.sendMail({
    from: `"${sender.name}" <${sender.email}>`,
    to,
    subject,
    html,
  });
  return info;
};
