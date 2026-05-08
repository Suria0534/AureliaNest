import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";

const isNoSizeCategory = (categoryValue) => /(ornament|jewelry|necklace|ring|bangle|earring|saree|sari)/.test(String(categoryValue || "").toLowerCase());

const normalizeOrderStatus = (statusValue) => {
  const raw = String(statusValue || "").trim().toLowerCase();
  if (raw === "deliver" || raw === "delivered" || raw === "mark delivered") return "delivered";
  if (raw === "ship" || raw === "shipped") return "shipped";
  if (raw === "process" || raw === "processing") return "processing";
  return raw;
};

const getDeliveryZoneFromDistrict = (districtValue) => {
  const raw = String(districtValue || "").trim().toLowerCase();
  return raw === "dhaka" ? "inside_dhaka" : "outside_dhaka";
};

const getDeliveryFee = (deliveryZone) => (deliveryZone === "outside_dhaka" ? 120 : 80);

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const { customerName, phone, customerEmail, address, cartItems, deliveryDistrict } = req.body;
    const normalizedDeliveryDistrict = String(deliveryDistrict || "").trim();

    if (
      !customerName ||
      !phone ||
      !customerEmail ||
      !address ||
      !normalizedDeliveryDistrict ||
      !Array.isArray(cartItems) ||
      cartItems.length === 0
    ) {
      return res.status(400).json({ message: "Customer info and cart items are required." });
    }

    let createdOrder = null;

    await session.withTransaction(async () => {
      const productIds = cartItems.map((item) => item.productId);
      const products = await Product.find({ _id: { $in: productIds } }).session(session);
      const productMap = new Map(products.map((product) => [String(product._id), product]));

      const orderItems = [];
      let subtotal = 0;

      for (const cartItem of cartItems) {
        const product = productMap.get(cartItem.productId);

        if (!product) {
          throw new Error("Some products in cart are no longer available.");
        }

        const quantity = Number(cartItem.quantity) || 1;
        const selectedSize = isNoSizeCategory(product.category)
          ? ""
          : String(cartItem.size || product.size || "Free Size").trim();

        if (Array.isArray(product.sizeInventory) && product.sizeInventory.length > 0) {
          const inventoryEntry = product.sizeInventory.find((entry) => entry.size === selectedSize);

          if (!inventoryEntry) {
            throw new Error(`Selected size ${selectedSize} is unavailable for ${product.title}.`);
          }

          if (inventoryEntry.quantity < quantity) {
            throw new Error(`Selected size ${selectedSize} is out of stock for ${product.title}.`);
          }

          inventoryEntry.quantity -= quantity;
          product.stock = product.sizeInventory.reduce((sum, entry) => sum + entry.quantity, 0);
        } else {
          if (product.stock < quantity) {
            throw new Error(`Insufficient stock for ${product.title}.`);
          }

          product.stock -= quantity;
        }

        await product.save({ session });

        orderItems.push({
          productId: product._id,
          title: product.title,
          sellerName: product.sellerName,
          uploadedBy: product.uploadedBy || "",
          size: selectedSize,
          price: product.price,
          quantity,
        });

        subtotal += product.price * quantity;
      }

      const normalizedDeliveryZone = getDeliveryZoneFromDistrict(normalizedDeliveryDistrict);
      const deliveryFee = getDeliveryFee(normalizedDeliveryZone);
      const total = subtotal + deliveryFee;

      const [order] = await Order.create(
        [
          {
            customerName,
            phone,
            customerEmail: String(customerEmail).toLowerCase().trim(),
            address,
            deliveryDistrict: normalizedDeliveryDistrict,
            deliveryZone: normalizedDeliveryZone,
            items: orderItems,
            subtotal,
            deliveryFee,
            total,
          },
        ],
        { session }
      );

      createdOrder = order;
    });

    res.status(201).json(createdOrder);
  } catch (error) {
    res.status(400).json({ message: error.message || "Failed to place order." });
  } finally {
    await session.endSession();
  }
};

export const getOrders = async (req, res) => {
  try {
    const userRole = String(req.user?.role || "").trim().toLowerCase();
    const actorName = String(req.user?.name || "").trim().toLowerCase();
    const actorEmail = String(req.user?.email || "").trim().toLowerCase();

    if (!userRole) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const { sellerName } = req.query;
    let orders = await Order.find().sort({ createdAt: -1 });

    if (userRole === "seller") {
      orders = orders.filter((order) =>
        order.items.some((item) => {
          const byUploader = String(item.uploadedBy || "").trim().toLowerCase();
          const byCompany = String(item.sellerName || "").trim().toLowerCase();
          return actorName && (actorName === byUploader || actorName === byCompany);
        })
      );
    } else if (userRole === "customer") {
      orders = orders.filter((order) => String(order.customerEmail || "").trim().toLowerCase() === actorEmail);
    }

    if (sellerName) {
      const normalizedSeller = sellerName.toLowerCase();
      orders = orders.filter((order) =>
        order.items.some((item) => item.sellerName.toLowerCase() === normalizedSeller)
      );
    }

    res.json(orders);
  } catch (_error) {
    res.status(500).json({ message: "Failed to fetch orders." });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, role, actorName } = req.body || {};
    const normalizedStatus = normalizeOrderStatus(status);

    if (!["processing", "shipped", "delivered"].includes(normalizedStatus)) {
      return res.status(400).json({ message: "Invalid order status." });
    }

    const normalizedRole = String(req.user?.role || role || "").toLowerCase();
    if (!["seller", "admin"].includes(normalizedRole)) {
      return res.status(403).json({ message: "Only seller or admin can update delivery status." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: "Order not found." });
    }

    if (normalizedRole === "seller") {
      const actor = String(req.user?.name || actorName || "").trim().toLowerCase();
      const sellerHasItem = order.items.some((item) => {
        const byUploader = String(item.uploadedBy || "").trim().toLowerCase();
        const byCompany = String(item.sellerName || "").trim().toLowerCase();
        return actor && (actor === byUploader || actor === byCompany);
      });

      if (!sellerHasItem) {
        return res.status(403).json({ message: "You can only update your related orders." });
      }
    }

    order.status = normalizedStatus;
    await order.save();

    res.json({ message: "Order status updated successfully.", order });
  } catch (_error) {
    res.status(500).json({ message: "Failed to update order status." });
  }
};
