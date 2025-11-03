import fetch from "node-fetch";
import nodemailer from "nodemailer";
import "dotenv/config"; // loads .env file automatically
const URL =
  "https://ipr.esveikata.lt/api/searches/appointments/times?municipalityId=6&organizationId=1000097423&specialistId=1000311919&page=0&size=50";

//sitas paskausko laikai
const URL1 =
  "https://ipr.esveikata.lt/api/searches/appointments/times?municipalityId=6&organizationId=1000097423&specialistId=1000107448&page=0&size=50";

function hasData(payload) {
  if (Array.isArray(payload)) return payload.length > 0;
  if (payload && typeof payload === "object") {
    const arr =
      payload.content ||
      payload.items ||
      payload.results ||
      payload.data ||
      payload.list;
    return Array.isArray(arr) && arr.length > 0;
  }
  return false;
}

async function main() {
  try {
    console.log("Fetching data…");
    const res = await fetch(URL, { headers: { Accept: "application/json" } });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    if (hasData(data)) {
      console.log("Data found — sending email…");
      await sendEmail({
        subject: "Test. Paskauskas e.sveikata appointments available",
        body:
          "Paskauskas yra laisvu apoinmentu. There are available appointments.\\n\\n" +
          URL,
      });
      console.log("Email sent!");
    } else {
      console.log("No data found. Nothing to send.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

async function sendEmail({ subject, body }) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_TO,
    subject,
    text: body,
  });
}

main();
