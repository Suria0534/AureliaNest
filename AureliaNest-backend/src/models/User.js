import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["customer", "seller", "admin"],
      required: true,
      default: "customer",
    },
    sellerApplicationStatus: {
      type: String,
      enum: ["none", "pending", "approved", "declined"],
      default: "none",
    },
    sellerAppliedAt: {
      type: Date,
      default: null,
    },
    sellerReviewedAt: {
      type: Date,
      default: null,
    },
    sellerReviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sellerApplicationNote: {
      type: String,
      trim: true,
      default: "",
    },
    profilePictureUrl: {
      type: String,
      default: null,
    },
    companyName: {
      type: String,
      trim: true,
      default: "",
    },
    tradeLicenseNumber: {
      type: String,
      trim: true,
      default: "",
    },
    businessDescription: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
