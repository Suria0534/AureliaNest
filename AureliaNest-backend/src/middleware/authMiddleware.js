import jwt from "jsonwebtoken";

const getTokenFromHeader = (authorizationHeader = "") => {
  const [scheme, token] = String(authorizationHeader || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return "";
  }

  return token;
};

export const authenticateToken = (req, res, next) => {
  try {
    const token = getTokenFromHeader(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "Authentication token is required." });
    }

    const secret = process.env.JWT_SECRET || "daraz-lite-dev-secret";
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired authentication token." });
  }
};

export const requireRole = (...allowedRoles) => {
  const normalizedRoles = allowedRoles.map((role) => String(role || "").toLowerCase());

  return (req, res, next) => {
    const userRole = String(req.user?.role || "").toLowerCase();

    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({ message: "You do not have permission to access this resource." });
    }

    return next();
  };
};