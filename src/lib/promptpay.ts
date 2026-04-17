import generatePayload from "promptpay-qr";
import QRCode from "qrcode";

/**
 * Generate a PromptPay QR payload + PNG data URL for a given amount.
 * `id` can be a Thai mobile number (10 digits) or national ID (13 digits).
 */
export async function generatePromptPayQR(
  id: string,
  amount: number
): Promise<{ payload: string; dataUrl: string }> {
  const normalized = id.replace(/\D/g, "");
  const payload = generatePayload(normalized, { amount });
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 400,
    color: { dark: "#000000", light: "#FFFFFF" },
  });
  return { payload, dataUrl };
}
