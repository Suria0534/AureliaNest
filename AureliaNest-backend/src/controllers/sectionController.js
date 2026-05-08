import { Section } from "../models/Section.js";

const defaultSections = [
  { key: "dress", label: "Dress", image: "/assets/images/pink.jpg", displayOrder: 1 },
  { key: "saree", label: "Saree", image: "/assets/images/jamdani.png", displayOrder: 2 },
  { key: "ornament", label: "Ornament", image: "/assets/images/jwellary.jpg", displayOrder: 3 },
  { key: "men", label: "Men", image: "/assets/images/men.png", displayOrder: 4 },
  { key: "female-shoes", label: "Female Shoes", image: "/assets/images/heels.png", displayOrder: 5 },
  { key: "male-shoes", label: "Male Shoes", image: "/assets/images/male.png", displayOrder: 6 },
  { key: "makeup", label: "Makeup", image: "/assets/images/makeup.png", displayOrder: 7 },
  { key: "kids-girls", label: "Kids Girls Wear", image: "/assets/images/child.jpg", displayOrder: 8 },
  { key: "kids-boys", label: "Kids Boys Wear", image: "/assets/images/male_baby.png", displayOrder: 9 },
];

const ensureDefaultSections = async () => {
  const count = await Section.countDocuments();
  if (count > 0) return;

  await Section.insertMany(
    defaultSections.map((entry) => ({
      ...entry,
      description: "",
      isActive: true,
    }))
  );
};

const slugifyKey = (value = "") =>
  String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const buildUniqueSectionKey = async (baseLabel, fallbackKey = "") => {
  const base = slugifyKey(fallbackKey) || slugifyKey(baseLabel) || "section";
  let candidate = base;
  let suffix = 1;

  while (await Section.exists({ key: candidate })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
};

export const getSections = async (_req, res) => {
  try {
    await ensureDefaultSections();
    const sections = await Section.find({ isActive: true }).sort({ displayOrder: 1 });
    res.json(sections);
  } catch (_error) {
    res.status(500).json({ message: "Failed to fetch sections." });
  }
};

export const getAllSections = async (_req, res) => {
  try {
    await ensureDefaultSections();
    const sections = await Section.find().sort({ displayOrder: 1 });
    res.json(sections);
  } catch (_error) {
    res.status(500).json({ message: "Failed to fetch sections." });
  }
};

export const createSection = async (req, res) => {
  try {
    const { key, label, image, description, displayOrder } = req.body;

    if (!label) {
      return res.status(400).json({ message: "Section name is required." });
    }

    const uniqueKey = await buildUniqueSectionKey(label, key);

    const section = await Section.create({
      key: uniqueKey,
      label: label.trim(),
      image: image || "",
      description: description || "",
      displayOrder: Number(displayOrder) || 0,
    });

    res.status(201).json(section);
  } catch (_error) {
    res.status(500).json({ message: "Failed to create section." });
  }
};

export const updateSection = async (req, res) => {
  try {
    const { id } = req.params;
    const { label, image, description, displayOrder, isActive } = req.body;

    const section = await Section.findById(id);
    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }

    if (label) section.label = label.trim();
    if (image !== undefined) section.image = image || "";
    if (description !== undefined) section.description = description || "";
    if (displayOrder !== undefined) section.displayOrder = Number(displayOrder);
    if (isActive !== undefined) section.isActive = Boolean(isActive);

    await section.save();
    res.json(section);
  } catch (_error) {
    res.status(500).json({ message: "Failed to update section." });
  }
};

export const deleteSection = async (req, res) => {
  try {
    const { id } = req.params;

    const section = await Section.findByIdAndDelete(id);
    if (!section) {
      return res.status(404).json({ message: "Section not found." });
    }

    res.json({ message: "Section deleted successfully." });
  } catch (_error) {
    res.status(500).json({ message: "Failed to delete section." });
  }
};
