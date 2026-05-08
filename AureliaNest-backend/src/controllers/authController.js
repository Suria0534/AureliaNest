import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const buildToken = (user) => {
  const secret = process.env.JWT_SECRET || "daraz-lite-dev-secret";
  return jwt.sign(
    {
      userId: String(user._id),
      role: user.role,
      name: user.name,
      email: user.email,
    },
    secret,
    { expiresIn: "7d" }
  );
};

export const signup = async (req, res) => {
  try {
    const { name, phone, email, password, role, adminSecret, companyName, tradeLicenseNumber, businessDescription } = req.body;
    const normalizedRole = String(role || "").toLowerCase().trim();

    if (!name || !phone || !email || !password || !normalizedRole) {
      return res.status(400).json({ message: "name, phone, email, password and role are required." });
    }

    if (!["customer", "seller", "admin"].includes(normalizedRole)) {
      return res.status(400).json({ message: "Invalid role." });
    }

    if (normalizedRole === "admin") {
      const expectedAdminSecret = String(process.env.ADMIN_SIGNUP_SECRET || "").trim();
      const providedAdminSecret = String(adminSecret || "").trim();

      if (!expectedAdminSecret || providedAdminSecret !== expectedAdminSecret) {
        return res.status(403).json({
          message: "Admin signup is restricted. Contact system owner for admin account provisioning.",
        });
      }
    }

    const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const isSellerApplication = normalizedRole === "seller";

    const user = await User.create({
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
      role: isSellerApplication ? "customer" : normalizedRole,
      sellerApplicationStatus: isSellerApplication ? "pending" : "none",
      sellerAppliedAt: isSellerApplication ? new Date() : null,
      sellerApplicationNote: isSellerApplication ? "Seller application submitted." : "",
      companyName: isSellerApplication ? String(companyName || "").trim() : "",
      tradeLicenseNumber: isSellerApplication ? String(tradeLicenseNumber || "").trim() : "",
      businessDescription: isSellerApplication ? String(businessDescription || "").trim() : "",
    });

    const token = buildToken(user);

    res.status(201).json({
      message: isSellerApplication
        ? "Seller application submitted. Please wait for admin approval."
        : "Account created successfully.",
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl,
        sellerApplicationStatus: user.sellerApplicationStatus,
        companyName: user.companyName,
        tradeLicenseNumber: user.tradeLicenseNumber,
        businessDescription: user.businessDescription,
      },
    });
  } catch (_error) {
    res.status(500).json({ message: "Signup failed." });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const normalizedRole = String(role || "").toLowerCase().trim();

    if (!email || !password || !normalizedRole) {
      return res.status(400).json({ message: "email, password and role are required." });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (normalizedRole === "seller") {
      if (user.role !== "seller") {
        if (user.sellerApplicationStatus === "pending") {
          return res.status(403).json({ message: "Seller application is pending admin approval." });
        }

        if (user.sellerApplicationStatus === "declined") {
          return res.status(403).json({ message: "Seller application was declined by admin." });
        }

        return res.status(403).json({ message: "You are not approved as seller yet." });
      }
    } else if (String(user.role || "").toLowerCase() !== normalizedRole) {
      return res.status(403).json({ message: "Role does not match this account." });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const token = buildToken(user);

    res.json({
      token,
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl,
        sellerApplicationStatus: user.sellerApplicationStatus,
      },
    });
  } catch (_error) {
    res.status(500).json({ message: "Login failed." });
  }
};

export const getSellerApplications = async (req, res) => {
  try {
    const status = String(req.query.status || "pending").toLowerCase().trim();
    const allowed = new Set(["pending", "approved", "declined", "all"]);

    if (!allowed.has(status)) {
      return res.status(400).json({ message: "Invalid status filter." });
    }

    const filter = status === "all"
      ? { sellerApplicationStatus: { $in: ["pending", "approved", "declined"] } }
      : { sellerApplicationStatus: status };

    const users = await User.find(filter)
      .select("name phone email role sellerApplicationStatus sellerAppliedAt sellerReviewedAt sellerApplicationNote companyName tradeLicenseNumber businessDescription")
      .sort({ sellerAppliedAt: -1, createdAt: -1 });

    res.json(users);
  } catch (_error) {
    res.status(500).json({ message: "Failed to load seller applications." });
  }
};

export const reviewSellerApplication = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, note } = req.body;
    const normalizedAction = String(action || "").toLowerCase().trim();

    if (!["approve", "decline"].includes(normalizedAction)) {
      return res.status(400).json({ message: "action must be approve or decline." });
    }

    const targetUser = await User.findById(userId);

    if (!targetUser) {
      return res.status(404).json({ message: "User not found." });
    }

    if (targetUser.sellerApplicationStatus !== "pending") {
      return res.status(400).json({ message: "Only pending applications can be reviewed." });
    }

    const isApprove = normalizedAction === "approve";

    targetUser.sellerApplicationStatus = isApprove ? "approved" : "declined";
    targetUser.role = isApprove ? "seller" : "customer";
    targetUser.sellerReviewedAt = new Date();
    targetUser.sellerReviewedBy = req.user?.userId || null;
    targetUser.sellerApplicationNote = String(note || (isApprove ? "Approved by admin." : "Declined by admin.")).trim();

    await targetUser.save();

    res.json({
      message: isApprove ? "Seller approved successfully." : "Seller application declined.",
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        phone: targetUser.phone,
        email: targetUser.email,
        role: targetUser.role,
        sellerApplicationStatus: targetUser.sellerApplicationStatus,
        sellerAppliedAt: targetUser.sellerAppliedAt,
        sellerReviewedAt: targetUser.sellerReviewedAt,
        sellerApplicationNote: targetUser.sellerApplicationNote,
      },
    });
  } catch (_error) {
    res.status(500).json({ message: "Failed to review seller application." });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, profilePictureUrl } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (name) user.name = String(name).trim();
    if (phone) user.phone = String(phone).trim();
    if (profilePictureUrl) user.profilePictureUrl = String(profilePictureUrl).trim();

    await user.save();

    res.json({
      message: "Profile updated successfully.",
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl,
      },
    });
  } catch (_error) {
    res.status(500).json({ message: "Failed to update profile." });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      message: "User deleted successfully.",
    });
  } catch (_error) {
    res.status(500).json({ message: "Failed to delete user." });
  }
};

export const editUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, phone, email, role } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email: String(email).toLowerCase().trim() });
      if (existingUser) {
        return res.status(400).json({ message: "Email is already in use." });
      }
      user.email = String(email).toLowerCase().trim();
    }

    if (name) user.name = String(name).trim();
    if (phone) user.phone = String(phone).trim();
    if (role && ["customer", "seller", "admin"].includes(String(role).toLowerCase())) {
      user.role = String(role).toLowerCase();
    }

    await user.save();

    res.json({
      message: "User updated successfully.",
      user: {
        _id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl,
      },
    });
  } catch (_error) {
    res.status(500).json({ message: "Failed to update user." });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-passwordHash")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (_error) {
    res.status(500).json({ message: "Failed to load users." });
  }
};
