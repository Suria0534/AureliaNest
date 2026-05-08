import mongoose from "mongoose";

const sizeInventorySchema = new mongoose.Schema(
  {
    size: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    imageUrl: {
      type: String,
      default: "",
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    campaignTag: {
      type: String,
      enum: ["free-delivery", "seasonal-sale", "new-arrival", "clearance", "none"],
      default: "none",
      trim: true,
    },
    size: {
      type: String,
      default: "",
      trim: true,
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 4.2,
    },
    sizeInventory: {
      type: [sizeInventorySchema],
      default: [],
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 1,
    },
    sellerName: {
      type: String,
      required: true,
      trim: true,
    },
    fabric: {
      type: String,
      default: "",
      trim: true,
    },
    fitType: {
      type: String,
      default: "",
      trim: true,
    },
    metalType: {
      type: String,
      default: "",
      trim: true,
    },
    weightGram: {
      type: Number,
      min: 0,
      default: 0,
    },
    uploadedBy: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

export const Product = mongoose.model("Product", productSchema);
