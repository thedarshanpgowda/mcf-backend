import nodemailer from "nodemailer";
import { config } from "dotenv";

config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: "noreply.yaaprivatelimited@gmail.com",
    pass: process.env.GOOGLE_APP_PASSWORD,
  },
});

export { transporter };
