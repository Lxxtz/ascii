import smtplib
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime


class CrisisEmailAlert:
    """
    Sends automated Gmail alerts when bank liquidity metrics cross critical thresholds.
    
    Triggers:
      - LCR drops below 100%
      - Predicted survival days drop below 30
    
    Uses Gmail SMTP with App Passwords (required for accounts with 2FA).
    Includes cooldown throttling to avoid spamming the inbox.
    """

    def __init__(self):
        self.sender_email = "fluxshield.team@gmail.com"
        self.sender_password =  "vighexqcksbgsfvh"      # Gmail App Password
        self.recipient_email = "harshiljad@gmail.com"
        self.is_configured = True

        # Throttle: minimum seconds between emails
        self.cooldown_seconds = 60
        self._last_sent_time = 0

        # Track which alerts we've already fired so we don't repeat
        self._lcr_alert_sent = False
        self._survival_alert_sent = False

    # ------------------------------------------------------------------ #
    #  Configuration
    # ------------------------------------------------------------------ #
    def configure(self, sender_email: str, sender_password: str, recipient_email: str):
        """Store Gmail credentials and mark the service as ready."""
        self.sender_email = sender_email
        self.sender_password = sender_password
        self.recipient_email = recipient_email
        self.is_configured = True
        # Reset alert flags when reconfigured
        self._lcr_alert_sent = False
        self._survival_alert_sent = False
        self._last_sent_time = 0

    # ------------------------------------------------------------------ #
    #  Core: check a simulation record and send an alert if needed
    # ------------------------------------------------------------------ #
    def check_and_alert(self, record: dict) -> dict:
        """
        Inspect the latest simulation tick and fire an email if any
        crisis threshold is breached.

        Returns a small status dict for the API response.
        """
        if not self.is_configured:
            return {"alert_status": "not_configured"}

        alerts_fired = []

        lcr = record.get("LCR", 999)
        survival = record.get("Predicted_Survival_Days", 999)

        # --- LCR < 100% --------------------------------------------------
        if lcr < 100 and not self._lcr_alert_sent:
            subject = "⚠️ CRITICAL: LCR Below Regulatory Minimum"
            body = self._build_lcr_body(record)
            sent = self._send_email(subject, body)
            if sent:
                self._lcr_alert_sent = True
                alerts_fired.append("lcr_below_100")

        # --- Predicted Survival < 30 days ---------------------------------
        if survival < 30 and not self._survival_alert_sent:
            subject = "🚨 URGENT: Bank Survival Horizon Under 30 Days"
            body = self._build_survival_body(record)
            sent = self._send_email(subject, body)
            if sent:
                self._survival_alert_sent = True
                alerts_fired.append("survival_below_30")

        # Reset flags if metrics recover (so alert can fire again later)
        if lcr >= 100:
            self._lcr_alert_sent = False
        if survival >= 30:
            self._survival_alert_sent = False

        return {
            "alert_status": "checked",
            "alerts_fired": alerts_fired,
        }

    # ------------------------------------------------------------------ #
    #  Email bodies
    # ------------------------------------------------------------------ #
    @staticmethod
    def _build_lcr_body(record: dict) -> str:
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <div style="background: linear-gradient(135deg, #dc3545, #c82333); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin:0;">⚠️ Liquidity Coverage Ratio Alert</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
                <p>The bank's <strong>LCR has dropped below the 100% regulatory minimum</strong>.</p>
                <table style="width:100%; border-collapse: collapse; margin: 15px 0;">
                    <tr style="background:#f8f9fa;">
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Date</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">{record.get('Date', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Current LCR</strong></td>
                        <td style="padding:10px; border:1px solid #ddd; color:#dc3545; font-weight:bold;">{record.get('LCR', 'N/A')}%</td>
                    </tr>
                    <tr style="background:#f8f9fa;">
                        <td style="padding:10px; border:1px solid #ddd;"><strong>HQLA Buffer</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${record.get('HQLA', 0):,.2f}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Net Liquidity Position</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${record.get('NLP', 0):,.2f}</td>
                    </tr>
                    <tr style="background:#f8f9fa;">
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Predicted Survival</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">{record.get('Predicted_Survival_Days', 'N/A')} days</td>
                    </tr>
                </table>
                <p style="color:#dc3545;"><strong>Immediate action is required to restore the liquidity buffer.</strong></p>
                <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
                <p style="font-size:12px; color:#999;">This is an automated alert from the Bank Liquidity Monitoring System.</p>
            </div>
        </body>
        </html>
        """

    @staticmethod
    def _build_survival_body(record: dict) -> str:
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <div style="background: linear-gradient(135deg, #fd7e14, #e8590c); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin:0;">🚨 Survival Horizon Critical</h1>
            </div>
            <div style="padding: 20px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
                <p>The bank's <strong>predicted survival horizon has fallen below 30 days</strong>.</p>
                <table style="width:100%; border-collapse: collapse; margin: 15px 0;">
                    <tr style="background:#f8f9fa;">
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Date</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">{record.get('Date', 'N/A')}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Predicted Survival</strong></td>
                        <td style="padding:10px; border:1px solid #ddd; color:#fd7e14; font-weight:bold;">{record.get('Predicted_Survival_Days', 'N/A')} days</td>
                    </tr>
                    <tr style="background:#f8f9fa;">
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Current LCR</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">{record.get('LCR', 'N/A')}%</td>
                    </tr>
                    <tr>
                        <td style="padding:10px; border:1px solid #ddd;"><strong>HQLA Buffer</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${record.get('HQLA', 0):,.2f}</td>
                    </tr>
                    <tr style="background:#f8f9fa;">
                        <td style="padding:10px; border:1px solid #ddd;"><strong>Net Liquidity Position</strong></td>
                        <td style="padding:10px; border:1px solid #ddd;">${record.get('NLP', 0):,.2f}</td>
                    </tr>
                </table>
                <p style="color:#fd7e14;"><strong>The bank may become insolvent within {record.get('Predicted_Survival_Days', '?')} days at the current trajectory.</strong></p>
                <hr style="border:none; border-top:1px solid #eee; margin:20px 0;">
                <p style="font-size:12px; color:#999;">This is an automated alert from the Bank Liquidity Monitoring System.</p>
            </div>
        </body>
        </html>
        """

    # ------------------------------------------------------------------ #
    #  Low-level SMTP send (with cooldown)
    # ------------------------------------------------------------------ #
    def _send_email(self, subject: str, html_body: str) -> bool:
        """Send an HTML email via Gmail SMTP. Returns True on success."""
        now = time.time()
        if now - self._last_sent_time < self.cooldown_seconds:
            print(f"[EmailAlert] Skipped (cooldown): {subject}")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.sender_email
            msg["To"] = self.recipient_email
            msg.attach(MIMEText(html_body, "html"))

            with smtplib.SMTP("smtp.gmail.com", 587) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, self.recipient_email, msg.as_string())

            self._last_sent_time = time.time()
            print(f"[EmailAlert] ✅ Sent: {subject}  →  {self.recipient_email}")
            return True

        except Exception as e:
            print(f"[EmailAlert] ❌ Failed to send: {e}")
            return False

    # ------------------------------------------------------------------ #
    #  Reset (called when simulation resets)
    # ------------------------------------------------------------------ #
    def reset_alerts(self):
        """Clear alert flags so they can fire again in a new simulation."""
        self._lcr_alert_sent = False
        self._survival_alert_sent = False
        self._last_sent_time = 0
