// routes/alerts.js
require('dotenv').config();
const Express = require('express');
const axios = require('axios');
const nodemailer = require('nodemailer');

const {
    url,
    temperatureRange,
    batteryPercentageRange,
    spo2Range,
    minHeartRateRange,
    maxHeartRateRange
} = require('../utils/Range');

const router = Express.Router();

// Config
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const EMAIL_COOLDOWN_MS = Number(process.env.EMAIL_COOLDOWN_MS || 60000);

// Email env
const ALERT_EMAIL = process.env.ALERT_EMAIL || "";
const ALERT_EMAIL_PASSWORD = process.env.ALERT_EMAIL_PASSWORD || "";
const ALERT_TO = process.env.ALERT_TO || "";

// Transporter
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: ALERT_EMAIL,
        pass: ALERT_EMAIL_PASSWORD,
    },
});

// Cooldown flag
let canSendEmail = true;

// ---------------- EMAIL FUNCTION ---------------------

async function sendAlertEmail(allFields, gpsString) {
    let lat = null, lon = null;

    // Parse lat/lon from gps string
    if (gpsString && gpsString.includes(",")) {
        const parts = gpsString.split(",");
        lat = parts[0]?.trim();
        lon = parts[1]?.trim();
    }

    // Build table rows
    const rowsHtml = Object.keys(allFields)
        .filter(k => k !== "__meta")
        .map(key => `
            <tr style="border-bottom:1px solid #eee;">
                <td style="padding:8px 6px;font-weight:600;">${key}</td>
                <td style="padding:8px 6px;color:#d9534f;font-weight:800;">
                    ${allFields[key]}
                </td>
            </tr>
        `).join("");

    // Fall highlight
    const fallHtml = allFields["Fall detected"] === 1
        ? `<div style="text-align:center;margin:10px 0;font-weight:800;color:#b02a37;">
             ⚠ FALL DETECTED — USER MAY BE IN DANGER
           </div>`
        : "";

    // GPS Button Only If Fall Detected + Valid Lat Lon
    const gpsLinkHtml =
        (allFields["Fall detected"] === 1 && lat && lon)
            ? `<div style="text-align:center;margin-top:15px;">
                <a href="https://www.google.com/maps?q=${lat},${lon}"
                   style="background:#d9534f;color:#fff;padding:10px 14px;
                   border-radius:6px;text-decoration:none;font-weight:700;">
                   📍 Open GPS Location
                </a>
               </div>`
            : "";

    const htmlMessage = `
        <div style="background:#f8f9fa;padding:18px;border-radius:10px;
             font-family:Arial;color:#333;max-width:700px;">
            <h2 style="text-align:center;color:#d9534f;margin-bottom:10px;">
                ⚠ Sensor Alert Triggered
            </h2>
            One or more sensor values exceeded allowed ranges.
            ${fallHtml}
            <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid #ddd;">
                <table style="width:100%;border-collapse:collapse;font-size:14px;">
                    <thead>
                        <tr>
                            <th style="padding:8px 6px;border-bottom:2px solid #ddd;text-align:left;">Sensor</th>
                            <th style="padding:8px 6px;border-bottom:2px solid #ddd;text-align:left;">Value</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
            ${gpsLinkHtml}
            <p style="margin-top:10px;text-align:center;font-size:12px;color:#777;">
                This is an automated alert. Please investigate immediately.
            </p>
        </div>
    `;

    try {
        await transporter.sendMail({
            from: ALERT_EMAIL,
            to: ALERT_TO,
            subject: "⚠ Sensor Alert",
            html: htmlMessage
        });

        console.log("📧 Alert Email Sent Successfully!");

        // Cooldown
        canSendEmail = false;
        setTimeout(() => {
            canSendEmail = true;
            console.log("⏳ Cooldown ended — emails enabled again.");
        }, EMAIL_COOLDOWN_MS);

    } catch (err) {
        console.error("❌ Email send error:", err);
    }
}

// ---------------- CHECK DATA ------------------------

async function checkData() {
    try {
        const res = await axios.get(url);
        const data = res.data;

        if (!data?.feeds?.length) return;

        const recent = data.feeds[data.feeds.length - 1];

        // Parse values
        const temperature = Number(recent.field2 ?? 0);
        const fallDetected = Number(recent.field3 ?? 0);
        const stepCount = Number(recent.field4 ?? 0);
        const battery = Number(recent.field5 ?? 0);
        const heartRate = Number(recent.field6 ?? 0);
        const spo2 = Number(recent.field7 ?? 0);
        const gps = recent.field8 ?? "";   // FIXED

        const fields = {
            "Temperature": temperature,
            "Fall detected": fallDetected,
            "Step count": stepCount,
            "Battery percentage": battery,
            "Heart rate": heartRate,
            "Spo2": spo2
        };

        // Violations
        let violated = false;
        if (temperature >= temperatureRange) violated = true;
        if (battery <= batteryPercentageRange) violated = true;
        if (spo2 <= spo2Range) violated = true;
        if (heartRate <= minHeartRateRange || heartRate >= maxHeartRateRange) violated = true;
        if (fallDetected === 1) violated = true;

        if (violated) {
            console.log("🚨 Violations found!");
            if (canSendEmail) {
                await sendAlertEmail(fields, gps);
            }
        } else {
            console.log("✔ All values normal.");
        }

    } catch (err) {
        console.error("❌ Error:", err.message);
    }
}

// ---------------- POLLING START --------------------

if (url) {
    console.log(`✔ Polling ThinkSpeak every ${POLL_INTERVAL_MS}ms`);
    checkData();
    setInterval(checkData, POLL_INTERVAL_MS);
}

// Health check
router.get('/health', (req, res) => {
    res.json({ status: "ok" });
});

module.exports = router;
