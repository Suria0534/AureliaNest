import { Product } from "../models/Product.js";

const isNoSizeCategory = (categoryValue) => /(ornament|jewelry|necklace|ring|bangle|earring|saree|sari)/.test(String(categoryValue || "").toLowerCase());
const isDressCategory = (categoryValue) => /(dress|kameez|gown|frock|kurti)/.test(String(categoryValue || "").toLowerCase());
const isOrnamentCategory = (categoryValue) => /(ornament|jewelry|necklace|ring|bangle|earring)/.test(String(categoryValue || "").toLowerCase());

const canSellerManage = (product, actorName) => {
  const actor = String(actorName || "").trim().toLowerCase();
  if (!actor) return false;
  const ownerByUploader = String(product.uploadedBy || "").trim().toLowerCase();
  const ownerByCompany = String(product.sellerName || "").trim().toLowerCase();
  return actor === ownerByUploader || actor === ownerByCompany;
};

export const getProducts = async (_req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (_error) {
    res.status(500).json({ message: "Failed to fetch products." });
  }
};

export const createProduct = async (req, res) => {
  try {
    const { title, description, price, imageUrl, category, campaignTag, size, rating, stock, sizeInventory, sellerName, uploadedBy, fabric, fitType, metalType, weightGram } = req.body;
    const authenticatedName = String(req.user?.name || "").trim();
    const authenticatedRole = String(req.user?.role || "").toLowerCase();

    if (!title || !description || !price || !category || !sellerName) {
      return res.status(400).json({ message: "Please provide all required product fields." });
    }

    if (isDressCategory(category) && (!String(fabric || "").trim() || !String(fitType || "").trim())) {
      return res.status(400).json({ message: "Dress products require fabric and fit type." });
    }

    const parsedWeight = Number(weightGram) || 0;
    if (isOrnamentCategory(category) && (!String(metalType || "").trim() || parsedWeight <= 0)) {
      return res.status(400).json({ message: "Ornament products require metal type and weight." });
    }

    const skipSize = isNoSizeCategory(category);

    const normalizedInventory = skipSize
      ? []
      : Array.isArray(sizeInventory)
        ? sizeInventory
            .map((item) => ({
              size: String(item.size || "").trim(),
              quantity: Math.max(0, Number(item.quantity) || 0),
            }))
            .filter((item) => item.size)
        : [];

    const computedStock =
      normalizedInventory.length > 0
        ? normalizedInventory.reduce((sum, item) => sum + item.quantity, 0)
        : Number(stock ?? 1);

    const displaySize =
      skipSize
        ? ""
        : normalizedInventory.find((item) => item.quantity > 0)?.size ||
          normalizedInventory[0]?.size ||
          size ||
          "Free Size";

    const product = await Product.create({
      title,
      description,
      price,
      imageUrl: imageUrl || "",
      category,
      campaignTag: String(campaignTag || "none").trim().toLowerCase(),
      size: displaySize,
      rating: Number(rating) || 4.2,
      sizeInventory: normalizedInventory,
      stock: Math.max(0, computedStock),
      sellerName,
      fabric: String(fabric || "").trim(),
      fitType: String(fitType || "").trim(),
      metalType: String(metalType || "").trim(),
      weightGram: Math.max(0, parsedWeight),
      uploadedBy: authenticatedName || String(uploadedBy || "").trim(),
    });

    res.status(201).json(product);
  } catch (_error) {
    res.status(500).json({ message: "Failed to create product." });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, actorName, title, description, price, imageUrl, category, campaignTag, rating, size, sizeInventory, sellerName, fabric, fitType, metalType, weightGram } = req.body || {};

    const normalizedRole = String(req.user?.role || role || "").toLowerCase();
    if (!["seller", "admin"].includes(normalizedRole)) {
      return res.status(403).json({ message: "Only seller or admin can edit products." });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const authenticatedActor = String(req.user?.name || actorName || "").trim();
    if (normalizedRole === "seller" && !canSellerManage(product, authenticatedActor)) {
      return res.status(403).json({ message: "You can only edit your own products." });
    }

    const nextCategory = String(category !== undefined && category !== null ? category : (product.category || "")).toLowerCase().trim();
    const skipSize = isNoSizeCategory(nextCategory);
    const nextFabric = String(fabric !== undefined && fabric !== null ? fabric : (product.fabric || "")).trim();
    const nextFitType = String(fitType !== undefined && fitType !== null ? fitType : (product.fitType || "")).trim();
    const nextMetalType = String(metalType !== undefined && metalType !== null ? metalType : (product.metalType || "")).trim();
    const parsedWeight = Number(weightGram !== undefined && weightGram !== null ? weightGram : product.weightGram) || 0;

    if (isDressCategory(nextCategory) && (!nextFabric || !nextFitType)) {
      return res.status(400).json({ message: "Dress products require fabric and fit type." });
    }

    if (isOrnamentCategory(nextCategory) && (!nextMetalType || parsedWeight <= 0)) {
      return res.status(400).json({ message: "Ornament products require metal type and weight." });
    }

    const normalizedInventory = skipSize
      ? []
      : Array.isArray(sizeInventory)
        ? sizeInventory
            .map((item) => ({
              size: String(item.size || "").trim(),
              quantity: Math.max(0, Number(item.quantity) || 0),
            }))
            .filter((item) => item.size)
        : Array.isArray(product.sizeInventory)
          ? product.sizeInventory
          : [];

    const computedStock =
      normalizedInventory.length > 0
        ? normalizedInventory.reduce((sum, item) => sum + item.quantity, 0)
        : Math.max(0, Number(product.stock) || 0);

    const displaySize =
      skipSize
        ? ""
        : normalizedInventory.find((item) => item.quantity > 0)?.size ||
          normalizedInventory[0]?.size ||
          String(size || product.size || "Free Size").trim();

    product.title = String(title !== undefined && title !== null ? title : (product.title || "")).trim();
    product.description = String(description !== undefined && description !== null ? description : (product.description || "")).trim();
    product.price = Number(price ?? product.price);
    product.imageUrl = String(imageUrl !== undefined && imageUrl !== null ? imageUrl : (product.imageUrl || "")).trim();
    product.category = nextCategory || product.category;
    product.campaignTag = String(campaignTag !== undefined && campaignTag !== null ? campaignTag : (product.campaignTag || "none")).trim().toLowerCase();
    product.rating = Number(rating !== undefined && rating !== null ? rating : (product.rating || 4.2));
    product.sellerName = String(sellerName !== undefined && sellerName !== null ? sellerName : (product.sellerName || "")).trim();
    product.fabric = nextFabric;
    product.fitType = nextFitType;
    product.metalType = nextMetalType;
    product.weightGram = Math.max(0, parsedWeight);
    product.sizeInventory = normalizedInventory;
    product.size = displaySize;
    product.stock = computedStock;

    if (!product.title || !product.description || !product.price || !product.category || !product.sellerName) {
      return res.status(400).json({ message: "Please provide all required product fields." });
    }

    await product.save();
    res.json(product);
  } catch (_error) {
    res.status(500).json({ message: "Failed to update product." });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, actorName } = req.body || {};

    const normalizedRole = String(req.user?.role || role || "").toLowerCase();

    if (!["seller", "admin"].includes(normalizedRole)) {
      return res.status(403).json({ message: "Only seller or admin can delete products." });
    }

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const authenticatedActor = String(req.user?.name || actorName || "").trim();
    if (normalizedRole === "seller" && !canSellerManage(product, authenticatedActor)) {
      return res.status(403).json({ message: "You can only delete your own products." });
    }

    await product.deleteOne();
    res.json({ message: "Product deleted successfully." });
  } catch (_error) {
    res.status(500).json({ message: "Failed to delete product." });
  }
};
