import fetch from "node-fetch";
import nodemailer from "nodemailer";
import "dotenv/config"; // loads .env file automatically

const URL =
  "https://ipr.esveikata.lt/api/searches/appointments/times?municipalityId=6&organizationId=1000097423&specialistId=1000311919&page=0&size=50";

// Paskausko laikai
const URL1 =
  "https://ipr.esveikata.lt/api/searches/appointments/times?municipalityId=6&organizationId=1000097423&specialistId=1000107448&page=0&size=50";

const esveikataBaseURL = "https://ipr.esveikata.lt";
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

// Extract rows from API response (works for either array or {content: [...]})
function getRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const arr =
      payload.content ||
      payload.items ||
      payload.results ||
      payload.data ||
      payload.list;
    if (Array.isArray(arr)) return arr;
  }
  return [];
}

// Build HTML table similar to the screenshot
function buildHtmlTable(rows, title) {
  const header = `
    <h2>${title}</h2>
    <table border="1" cellpadding="4" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px;">
      <thead style="background:#1f4f7f;color:white;">
        <tr>
          <th>Įstaiga / Gydytojas</th>
          <th>Paslauga</th>
          <th>Apmokėjimas</th>
          <th>Siuntimo poreikis</th>
          <th>Ankščiausias laikas</th>
          <th>Laisvi laikai už laikotarpį</th>
        </tr>
      </thead>
      <tbody>
  `;

  const body = rows
    .map((r) => {
      // 👇 Replace these field names with the real ones from your JSON
      const institution =
        r.organizationName ||
        r.healthcareInstitutionName ||
        r.institutionName ||
        "";
      const doctor = r.specialistFullName || r.doctorName || r.doctor || "";
      const service =
        r.healthcareServiceName || r.serviceName || r.service || "";
      const payment =
        r.fundType.name || r.paymentTypeName || r.payment || "Ligonių kasos"; // default guess
      const referral =
        r.referralNeed.name || r.referralRequirement || r.referral || ""; // e.g. "Su siuntimu" / "Be siuntimo"

      // time – try a few possible fields
      const rawTime =
        r.earliestDateTime ||
        r.earliestTime ||
        r.time ||
        r.appointmentDateTime ||
        "";
      const earliestTime = rawTime
        ? new Date(rawTime).toLocaleString("lt-LT")
        : "";

      // number of free times in period
      const count =
        r.freeSlotsCount || r.timesInPeriod || r.count || r.countInPeriod;
      const freePeriod = count != null ? `${count} – įstaigoje.` : "";

      const instDoctor = `${institution} ${doctor ? "/ " + doctor : ""}`;

      return `
        <tr>
          <td>${escapeHtml(instDoctor)}</td>
          <td>${escapeHtml(service)}</td>
          <td>${escapeHtml(payment)}</td>
          <td>${escapeHtml(referral)}</td>
          <td>${escapeHtml(earliestTime)}</td>
          <td>${escapeHtml(freePeriod)}</td>
        </tr>
      `;
    })
    .join("");

  const footer = `
      </tbody>
    </table>
  `;

  return header + body + footer;
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
      const rows = getRows(data);
      const htmlTable = buildHtmlTable(rows, "(dr.Paskauskas) – laisvi laikai");

      console.log("Data found — sending email…");
      await sendEmail({
        subject: " e.sveikata appointments available",
        text:
          "(dr.Paskauskas) yra laisvų appointmentų.\n\n" +
          URL +
          "\n\n(Pažiūrėk HTML versiją, jei lentelės nematai.)",
        html: `
          <p>(dr.Paskauskas) yra laisvų appointmentų. URL:</p>
          <p>Nuorodoje ivesti paieškos informaciją:</p>
          <p><a href="${esveikataBaseURL}">${esveikataBaseURL}</a></p>
          ${htmlTable}
        `,
      });
      console.log("Email sent!");
    } else {
      console.log("No data found. Nothing to send.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

async function sendEmail({ subject, text, html }) {
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
    to: process.env.MAIL_TO, // can be "a@x.com, b@y.com" for 2 emails
    subject,
    text,
    html,
  });
}

main();
