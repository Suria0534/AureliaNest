import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    sellerName: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String,
      default: "",
    },
    size: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryDistrict: {
      type: String,
      default: "",
      trim: true,
    },
    deliveryZone: {
      type: String,
      enum: ["inside_dhaka", "outside_dhaka"],
      default: "inside_dhaka",
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(arr) => arr.length > 0, "Order must contain at least one item."],
    },
    subtotal: {
      type: Number,
      required: true,
      min: 1,
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 80,
    },
    total: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: ["placed", "processing", "shipped", "delivered"],
      default: "placed",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["bKash", "Rocket", "Bank", "COD"],
      default: "bKash",
    },
    transactionId: {
      type: String,
      default: "",
    },
    payerNumber: {
      type: String,
      default: "",
      trim: true,
    },
    paymentReference: {
      type: String,
      default: "",
      trim: true,
    },
    paymentNote: {
      type: String,
      default: "",
      trim: true,
    },
    invoiceEmailSent: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Order = mongoose.model("Order", orderSchema);
