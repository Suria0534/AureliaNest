import { Product } from "../models/Product.js";
import { Order } from "../models/Order.js";

export const getSellerDashboard = async (req, res) => {
  try {
    const { sellerName } = req.params;
    const normalizedSeller = sellerName.toLowerCase();
    const authenticatedRole = String(req.user?.role || "").toLowerCase();
    const authenticatedName = String(req.user?.name || "").toLowerCase();

    if (authenticatedRole === "seller" && authenticatedName && authenticatedName !== normalizedSeller) {
      return res.status(403).json({ message: "You can only view your own seller dashboard." });
    }

    const products = await Product.find({
      $or: [
        { uploadedBy: new RegExp(`^${sellerName}$`, "i") },
        { sellerName: new RegExp(`^${sellerName}$`, "i") },
      ],
    }).sort({
      createdAt: -1,
    });

    const allOrders = await Order.find().sort({ createdAt: -1 });

    const sellerOrders = allOrders
      .map((order) => {
        const sellerItems = order.items.filter((item) => {
          const byUploader = String(item.uploadedBy || "").toLowerCase();
          const byCompany = String(item.sellerName || "").toLowerCase();
          return byUploader === normalizedSeller || byCompany === normalizedSeller;
        });

        if (sellerItems.length === 0) {
          return null;
        }

        const sellerSubtotal = sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

        return {
          _id: order._id,
          customerName: order.customerName,
          phone: order.phone,
          customerEmail: order.customerEmail,
          paymentStatus: order.paymentStatus,
          status: order.status,
          createdAt: order.createdAt,
          items: sellerItems,
          sellerSubtotal,
        };
      })
      .filter(Boolean);

    const revenue = sellerOrders
      .filter((order) => order.paymentStatus === "paid")
      .reduce((sum, order) => sum + order.sellerSubtotal, 0);

    res.json({
      sellerName,
      metrics: {
        totalProducts: products.length,
        totalOrders: sellerOrders.length,
        revenue,
      },
      products,
      orders: sellerOrders,
    });
  } catch (_error) {
    res.status(500).json({ message: "Failed to load seller dashboard." });
  }
};
