import nodemailer from "nodemailer";
import { Order } from "../models/Order.js";

const BKASH_NUMBER = process.env.BKASH_NUMBER || "01840268794";
const SUPPORTED_PAYMENT_METHODS = ["bKash", "Rocket", "Bank", "COD"];

const getPaymentLaunchConfig = ({ method, amount, orderId }) => {
  const safeAmount = Number(amount) > 0 ? Number(amount) : 0;
  const safeOrderId = String(orderId || "").trim();
  const defaultFrontendBase = process.env.FRONTEND_URL || "http://localhost:5173";

  if (method === "bKash") {
    const merchant = process.env.BKASH_MERCHANT_NUMBER || BKASH_NUMBER;
    const deepLink = `bkash://payment?amount=${encodeURIComponent(safeAmount)}&merchant=${encodeURIComponent(merchant)}&invoice=${encodeURIComponent(safeOrderId)}`;
    const webCheckoutUrl =
      process.env.BKASH_CHECKOUT_URL ||
      `${defaultFrontendBase}/checkout?gateway=bkash&amount=${encodeURIComponent(safeAmount)}&invoice=${encodeURIComponent(safeOrderId)}`;
    return { deepLink, webCheckoutUrl };
  }

  if (method === "Rocket") {
    const merchant = process.env.ROCKET_MERCHANT_NUMBER || "rocket-merchant";
    const deepLink = `rocket://payment?amount=${encodeURIComponent(safeAmount)}&merchant=${encodeURIComponent(merchant)}&invoice=${encodeURIComponent(safeOrderId)}`;
    const webCheckoutUrl =
      process.env.ROCKET_CHECKOUT_URL ||
      `${defaultFrontendBase}/checkout?gateway=rocket&amount=${encodeURIComponent(safeAmount)}&invoice=${encodeURIComponent(safeOrderId)}`;
    return { deepLink, webCheckoutUrl };
  }

  return { deepLink: "", webCheckoutUrl: "" };
};

const sendInvoiceEmail = async ({ order, toEmail, method }) => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || "no-reply@daraz-lite.local";

  const lines = order.items
    .map((item) => `- ${item.title} x ${item.quantity} = Tk ${item.price * item.quantity}`)
    .join("\n");

  const invoiceText = [
    `Invoice for Order ${order._id}`,
    `Customer: ${order.customerName}`,
    `Phone: ${order.phone}`,
    `Address: ${order.address}`,
    `Payment Method: ${method}`,
    "",
    "Items:",
    lines,
    "",
    `Subtotal: Tk ${order.subtotal}`,
    `Delivery: Tk ${order.deliveryFee}`,
    `Total: Tk ${order.total}`,
    method === "bKash" ? `bKash Number: ${BKASH_NUMBER}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log("Invoice email skipped: SMTP not configured.");
    return { sent: false, skipped: true };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to: toEmail,
    subject: `Daraz Lite Invoice - Order ${order._id}`,
    text: invoiceText,
  });

  return { sent: true, skipped: false };
};

export const confirmPayment = async (req, res) => {
  try {
    const { orderId, method, customerEmail, payerNumber, paymentReference, paymentNote } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: "orderId is required." });
    }

    if (!method || !SUPPORTED_PAYMENT_METHODS.includes(method)) {
      return res.status(400).json({ message: "method must be one of bKash, Rocket, Bank, COD." });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    const transactionId = `TXN-${Date.now()}`;
    order.paymentMethod = method;

    const normalizedPayerNumber = String(payerNumber || "").trim();
    const normalizedPaymentReference = String(paymentReference || "").trim();
    const normalizedPaymentNote = String(paymentNote || "").trim();

    if (method === "COD") {
      order.paymentStatus = "pending";
      order.transactionId = `COD-${Date.now()}`;
      order.payerNumber = "";
      order.paymentReference = "";
      order.paymentNote = normalizedPaymentNote;
    } else {
      if (!normalizedPayerNumber && !normalizedPaymentReference) {
        return res.status(400).json({ message: "Provide payment number or payment ID/reference for payment confirmation." });
      }

      order.paymentStatus = "paid";
      order.transactionId = transactionId;
      order.payerNumber = normalizedPayerNumber;
      order.paymentReference = normalizedPaymentReference;
      order.paymentNote = normalizedPaymentNote;
    }

    const emailTarget = String(customerEmail || order.customerEmail || "").toLowerCase().trim();

    const invoiceResult = emailTarget
      ? await sendInvoiceEmail({ order, toEmail: emailTarget, method })
      : { sent: false, skipped: true };

    order.invoiceEmailSent = Boolean(invoiceResult.sent);
    await order.save();

    res.json({
      message:
        method === "COD"
          ? "Cash on Delivery confirmed. Invoice processed."
          : `Payment successful via ${method}. Invoice processed.`,
      bkashNumber: BKASH_NUMBER,
      transactionId: order.transactionId,
      invoiceEmailSent: Boolean(invoiceResult.sent),
      invoiceEmailSkipped: Boolean(invoiceResult.skipped),
      order,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Payment confirmation failed." });
  }
};

export const mockPayment = async (req, res) => {
  req.body.method = req.body.method || "bKash";
  return confirmPayment(req, res);
};

export const launchPayment = async (req, res) => {
  try {
    const { method, amount, orderId } = req.body || {};

    if (!method || !["bKash", "Rocket"].includes(method)) {
      return res.status(400).json({ message: "method must be bKash or Rocket for app launch." });
    }

    const launchConfig = getPaymentLaunchConfig({ method, amount, orderId });

    res.json({
      message: `${method} launch info generated.`,
      method,
      canLaunchApp: Boolean(launchConfig.deepLink),
      deepLink: launchConfig.deepLink,
      webCheckoutUrl: launchConfig.webCheckoutUrl,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || "Failed to generate payment launch info." });
  }
};

export const paymentRedirect = async (req, res) => {
  const provider = String(req.query.provider || "").trim().toLowerCase();
  const status = String(req.query.status || "unknown").trim().toLowerCase();
  const transactionId = String(req.query.tx || req.query.transactionId || "").trim();

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  const redirectUrl = `${frontendUrl}/checkout?payment_provider=${encodeURIComponent(provider)}&payment_status=${encodeURIComponent(status)}&tx=${encodeURIComponent(transactionId)}`;

  return res.redirect(302, redirectUrl);
};
