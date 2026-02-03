// =====================
// Authentication Middleware
// =====================

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ detail: "Authentication required" });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const user = await db.collection("users").findOne({ id: decoded.userId });
    if (!user) {
      return res.status(401).json({ detail: "User not found" });
    }

    if (user.is_blocked) {
      return res.status(403).json({ detail: "Account has been blocked" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ detail: "Token expired", code: "TOKEN_EXPIRED" });
    }
    return res.status(401).json({ detail: "Invalid token" });
  }
};

// Optional auth - doesn't fail if no token, but attaches user if present
const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await db.collection("users").findOne({ id: decoded.userId });
      if (user && !user.is_blocked) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

// Admin middleware
const adminMiddleware = async (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ detail: "Admin access required" });
  }
  next();
};

// =====================
// Helper Functions
// =====================

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
};

const generateReferralCode = (userId) => {
  return `NAAN${userId.slice(0, 6).toUpperCase()}`;
};

const calculateLoyaltyPoints = (orderTotal) => {
  return Math.floor(orderTotal * POINTS_PER_POUND);
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  const phoneRegex = /^\+?[\d\s-]{10,}$/;
  return phoneRegex.test(phone);
};

const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// ========================================
// 1. AUTHENTICATION & USER MANAGEMENT
// ========================================

// 1.1 User Registration
app.post("/api/auth/register", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      referral_code,
    } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ detail: "Name, email, and password are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ detail: "Invalid email format" });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({
        detail: "Password must be at least 8 characters with uppercase, lowercase, and number",
      });
    }

    if (phone && !validatePhone(phone)) {
      return res.status(400).json({ detail: "Invalid phone number format" });
    }

    // Check if email already exists
    const existingUser = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ detail: "Email already registered" });
    }

    // Check if phone already exists
    if (phone) {
      const existingPhone = await db.collection("users").findOne({ phone });
      if (existingPhone) {
        return res.status(400).json({ detail: "Phone number already registered" });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const userId = uuidv4();
    const user = {
      id: userId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || null,
      password: hashedPassword,
      role: "customer",
      is_verified: false,
      is_blocked: false,
      loyalty_points: 0,
      total_orders: 0,
      total_spent: 0,
      referral_code: generateReferralCode(userId),
      referred_by: null,
      saved_addresses: [],
      dietary_preferences: [],
      allergen_alerts: [],
      spice_preference: "medium",
      notification_preferences: {
        email: true,
        sms: true,
        push: true,
        promotions: true,
        order_updates: true,
      },
      created_at: new Date(),
      updated_at: new Date(),
      last_login: new Date(),
    };

    // Handle referral code
    if (referral_code) {
      const referrer = await db.collection("users").findOne({ referral_code: referral_code.toUpperCase() });
      if (referrer && referrer.id !== userId) {
        user.referred_by = referral_code.toUpperCase();
        user.loyalty_points = REFERRAL_BONUS_REFEREE;

        // Give points to referrer
        await db.collection("users").updateOne(
          { id: referrer.id },
          {
            $inc: { loyalty_points: REFERRAL_BONUS_REFERRER },
          }
        );

        // Log referral transaction for referrer
        await db.collection("loyalty_transactions").insertOne({
          id: uuidv4(),
          user_id: referrer.id,
          type: "referral_bonus",
          points: REFERRAL_BONUS_REFERRER,
          description: `Referral bonus - ${name} joined using your code`,
          created_at: new Date(),
        });

        // Log referral transaction for new user
        await db.collection("loyalty_transactions").insertOne({
          id: uuidv4(),
          user_id: userId,
          type: "welcome_bonus",
          points: REFERRAL_BONUS_REFEREE,
          description: "Welcome bonus for using referral code",
          created_at: new Date(),
        });
      }
    }

    await db.collection("users").insertOne(user);

    // Generate tokens
    const tokens = generateTokens(userId);

    // Store refresh token
    await db.collection("refresh_tokens").insertOne({
      id: uuidv4(),
      user_id: userId,
      token: tokens.refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.status(201).json({
      message: "Registration successful",
      user: userWithoutPassword,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ detail: "Error registering user" });
  }
});

// 1.2 User Login
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: "Email and password are required" });
    }

    const user = await db.collection("users").findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    if (user.is_blocked) {
      return res.status(403).json({ detail: "Account has been blocked. Please contact support." });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      // Track failed login attempts
      await db.collection("users").updateOne(
        { id: user.id },
        {
          $inc: { failed_login_attempts: 1 },
          $set: { last_failed_login: new Date() },
        }
      );
      return res.status(401).json({ detail: "Invalid email or password" });
    }

    // Reset failed login attempts and update last login
    await db.collection("users").updateOne(
      { id: user.id },
      {
        $set: {
          failed_login_attempts: 0,
          last_login: new Date(),
        },
      }
    );

    // Generate tokens
    const tokens = generateTokens(user.id);

    // Store refresh token
    await db.collection("refresh_tokens").insertOne({
      id: uuidv4(),
      user_id: user.id,
      token: tokens.refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
    });

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      message: "Login successful",
      user: userWithoutPassword,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).json({ detail: "Error logging in" });
  }
});

// 1.3 Refresh Token
app.post("/api/auth/refresh", async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ detail: "Refresh token is required" });
    }

    // Verify refresh token
    const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET);

    // Check if token exists in database
    const storedToken = await db.collection("refresh_tokens").findOne({
      token: refresh_token,
      user_id: decoded.userId,
    });

    if (!storedToken) {
      return res.status(401).json({ detail: "Invalid refresh token" });
    }

    if (new Date(storedToken.expires_at) < new Date()) {
      await db.collection("refresh_tokens").deleteOne({ id: storedToken.id });
      return res.status(401).json({ detail: "Refresh token expired" });
    }

    // Get user
    const user = await db.collection("users").findOne({ id: decoded.userId });
    if (!user || user.is_blocked) {
      return res.status(401).json({ detail: "User not found or blocked" });
    }

    // Generate new tokens
    const tokens = generateTokens(user.id);

    // Delete old refresh token and store new one
    await db.collection("refresh_tokens").deleteOne({ id: storedToken.id });
    await db.collection("refresh_tokens").insertOne({
      id: uuidv4(),
      user_id: user.id,
      token: tokens.refreshToken,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
    });

    res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
  } catch (error) {
    console.error("Error refreshing token:", error);
    res.status(401).json({ detail: "Invalid refresh token" });
  }
});

// 1.4 Logout
app.post("/api/auth/logout", authMiddleware, async (req, res) => {
  try {
    const { refresh_token } = req.body;

    // Delete refresh token from database
    if (refresh_token) {
      await db.collection("refresh_tokens").deleteOne({
        token: refresh_token,
        user_id: req.user.id,
      });
    }

    // Optionally delete all refresh tokens for this user (logout from all devices)
    // await db.collection("refresh_tokens").deleteMany({ user_id: req.user.id });

    res.json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error logging out:", error);
    res.status(500).json({ detail: "Error logging out" });
  }
});

// 1.5 Get User Profile
app.get("/api/auth/profile", authMiddleware, async (req, res) => {
  const { password: _, ...userWithoutPassword } = req.user;
  
  // Get additional stats
  const orderCount = await db.collection("orders").countDocuments({ user_id: req.user.id });
  const reviewCount = await db.collection("reviews").countDocuments({ user_id: req.user.id });
  
  res.json({
    ...userWithoutPassword,
    stats: {
      total_orders: orderCount,
      total_reviews: reviewCount,
      member_since: req.user.created_at,
    },
  });
});

// 1.6 Update User Profile
app.put("/api/auth/profile", authMiddleware, async (req, res) => {
  try {
    const { name, phone, avatar_url } = req.body;

    const updates = {
      updated_at: new Date(),
    };

    if (name) updates.name = name.trim();
    if (phone) {
      if (!validatePhone(phone)) {
        return res.status(400).json({ detail: "Invalid phone number format" });
      }
      // Check if phone is already used by another user
      const existingPhone = await db.collection("users").findOne({
        phone,
        id: { $ne: req.user.id },
      });
      if (existingPhone) {
        return res.status(400).json({ detail: "Phone number already in use" });
      }
      updates.phone = phone;
    }
    if (avatar_url) updates.avatar_url = avatar_url;

    await db.collection("users").updateOne(
      { id: req.user.id },
      { $set: updates }
    );

    const updatedUser = await db.collection("users").findOne({ id: req.user.id });
    const { password: _, ...userWithoutPassword } = updatedUser;

    res.json({
      message: "Profile updated successfully",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ detail: "Error updating profile" });
  }
});

// 1.7 Change Password
app.put("/api/auth/change-password", authMiddleware, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ detail: "Current and new passwords are required" });
    }

    if (!validatePassword(new_password)) {
      return res.status(400).json({
        detail: "New password must be at least 8 characters with uppercase, lowercase, and number",
      });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(current_password, req.user.password);
    if (!isValidPassword) {
      return res.status(401).json({ detail: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(new_password, 12);

    await db.collection("users").updateOne(
      { id: req.user.id },
      {
        $set: {
          password: hashedPassword,
          updated_at: new Date(),
        },
      }
    );

    // Invalidate all refresh tokens (force re-login on all devices)
    await db.collection("refresh_tokens").deleteMany({ user_id: req.user.id });

    res.json({ message: "Password changed successfully. Please login again." });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({ detail: "Error changing password" });
  }
});

// 1.8 Update User Preferences
app.put("/api/auth/preferences", authMiddleware, async (req, res) => {
  try {
    const {
      dietary_preferences,
      allergen_alerts,
      spice_preference,
      notification_preferences,
    } = req.body;

    const updates = { updated_at: new Date() };

    if (dietary_preferences) {
      const validPreferences = ["vegetarian", "vegan", "halal", "gluten-free", "dairy-free"];
      const invalidPrefs = dietary_preferences.filter((p) => !validPreferences.includes(p));
      if (invalidPrefs.length > 0) {
        return res.status(400).json({ detail: `Invalid dietary preferences: ${invalidPrefs.join(", ")}` });
      }
      updates.dietary_preferences = dietary_preferences;
    }

    if (allergen_alerts) {
      const validAllergens = ["Gluten", "Dairy", "Nuts", "Eggs", "Soy", "Shellfish", "Fish"];
      const invalidAllergens = allergen_alerts.filter((a) => !validAllergens.includes(a));
      if (invalidAllergens.length > 0) {
        return res.status(400).json({ detail: `Invalid allergens: ${invalidAllergens.join(", ")}` });
      }
      updates.allergen_alerts = allergen_alerts;
    }

    if (spice_preference) {
      const validSpiceLevels = ["mild", "medium", "hot", "extra-hot"];
      if (!validSpiceLevels.includes(spice_preference)) {
        return res.status(400).json({ detail: "Invalid spice preference" });
      }
      updates.spice_preference = spice_preference;
    }

    if (notification_preferences) {
      updates.notification_preferences = {
        ...req.user.notification_preferences,
        ...notification_preferences,
      };
    }

    await db.collection("users").updateOne(
      { id: req.user.id },
      { $set: updates }
    );

    res.json({ message: "Preferences updated successfully" });
  } catch (error) {
    console.error("Error updating preferences:", error);
    res.status(500).json({ detail: "Error updating preferences" });
  }
});

// 1.9 Delete Account
app.delete("/api/auth/account", authMiddleware, async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ detail: "Password is required to delete account" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, req.user.password);
    if (!isValidPassword) {
      return res.status(401).json({ detail: "Incorrect password" });
    }

    // Soft delete - anonymize user data instead of hard delete
    await db.collection("users").updateOne(
      { id: req.user.id },
      {
        $set: {
          name: "Deleted User",
          email: `deleted_${req.user.id}@deleted.com`,
          phone: null,
          password: "",
          is_deleted: true,
          deleted_at: new Date(),
        },
      }
    );

    // Delete all refresh tokens
    await db.collection("refresh_tokens").deleteMany({ user_id: req.user.id });

    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ detail: "Error deleting account" });
  }
});

// ========================================
// 2. SAVED ADDRESSES
// ========================================

// 2.1 Add Address
app.post("/api/addresses", authMiddleware, async (req, res) => {
  try {
    const {
      label,
      address_line1,
      address_line2,
      city,
      postcode,
      country = "United Kingdom",
      latitude,
      longitude,
      is_default = false,
      delivery_instructions,
    } = req.body;

    // Validation
    if (!label || !address_line1 || !city || !postcode) {
      return res.status(400).json({ detail: "Label, address line 1, city, and postcode are required" });
    }

    // Limit number of saved addresses
    if (req.user.saved_addresses && req.user.saved_addresses.length >= 10) {
      return res.status(400).json({ detail: "Maximum 10 addresses allowed" });
    }

    const newAddress = {
      id: uuidv4(),
      label: label.trim(),
      address_line1: address_line1.trim(),
      address_line2: address_line2?.trim() || null,
      city: city.trim(),
      postcode: postcode.toUpperCase().trim(),
      country,
      latitude: latitude || null,
      longitude: longitude || null,
      is_default,
      delivery_instructions: delivery_instructions?.trim() || null,
      created_at: new Date(),
    };

    // If this is set as default, remove default from others
    if (is_default && req.user.saved_addresses?.length > 0) {
      await db.collection("users").updateOne(
        { id: req.user.id },
        { $set: { "saved_addresses.$[].is_default": false } }
      );
    }

    // If this is the first address, make it default
    if (!req.user.saved_addresses || req.user.saved_addresses.length === 0) {
      newAddress.is_default = true;
    }

    await db.collection("users").updateOne(
      { id: req.user.id },
      {
        $push: { saved_addresses: newAddress },
        $set: { updated_at: new Date() },
      }
    );

    res.status(201).json({
      message: "Address added successfully",
      address: newAddress,
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({ detail: "Error adding address" });
  }
});

// 2.2 Get All Addresses
app.get("/api/addresses", authMiddleware, async (req, res) => {
  const addresses = req.user.saved_addresses || [];
  // Sort with default address first
  addresses.sort((a, b) => (b.is_default ? 1 : 0) - (a.is_default ? 1 : 0));
  res.json(addresses);
});

// 2.3 Get Single Address
app.get("/api/addresses/:addressId", authMiddleware, async (req, res) => {
  const address = req.user.saved_addresses?.find((a) => a.id === req.params.addressId);
  if (!address) {
    return res.status(404).json({ detail: "Address not found" });
  }
  res.json(address);
});

// 2.4 Update Address
app.put("/api/addresses/:addressId", authMiddleware, async (req, res) => {
  try {
    const addressIndex = req.user.saved_addresses?.findIndex((a) => a.id === req.params.addressId);
    if (addressIndex === -1) {
      return res.status(404).json({ detail: "Address not found" });
    }

    const {
      label,
      address_line1,
      address_line2,
      city,
      postcode,
      country,
      latitude,
      longitude,
      is_default,
      delivery_instructions,
    } = req.body;

    const existingAddress = req.user.saved_addresses[addressIndex];
    const updatedAddress = {
      ...existingAddress,
      label: label?.trim() || existingAddress.label,
      address_line1: address_line1?.trim() || existingAddress.address_line1,
      address_line2: address_line2?.trim() || existingAddress.address_line2,
      city: city?.trim() || existingAddress.city,
      postcode: postcode?.toUpperCase().trim() || existingAddress.postcode,
      country: country || existingAddress.country,
      latitude: latitude !== undefined ? latitude : existingAddress.latitude,
      longitude: longitude !== undefined ? longitude : existingAddress.longitude,
      is_default: is_default !== undefined ? is_default : existingAddress.is_default,
      delivery_instructions: delivery_instructions?.trim() || existingAddress.delivery_instructions,
      updated_at: new Date(),
    };

    // If setting as default, unset others
    if (is_default && !existingAddress.is_default) {
      await db.collection("users").updateOne(
        { id: req.user.id },
        { $set: { "saved_addresses.$[].is_default": false } }
      );
    }

    await db.collection("users").updateOne(
      { id: req.user.id, "saved_addresses.id": req.params.addressId },
      { $set: { "saved_addresses.$": updatedAddress } }
    );

    res.json({
      message: "Address updated successfully",
      address: updatedAddress,
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({ detail: "Error updating address" });
  }
});

// 2.5 Delete Address
app.delete("/api/addresses/:addressId", authMiddleware, async (req, res) => {
  try {
    const address = req.user.saved_addresses?.find((a) => a.id === req.params.addressId);
    if (!address) {
      return res.status(404).json({ detail: "Address not found" });
    }

    await db.collection("users").updateOne(
      { id: req.user.id },
      {
        $pull: { saved_addresses: { id: req.params.addressId } },
        $set: { updated_at: new Date() },
      }
    );

    // If deleted address was default, set first remaining as default
    if (address.is_default) {
      const user = await db.collection("users").findOne({ id: req.user.id });
      if (user.saved_addresses && user.saved_addresses.length > 0) {
        await db.collection("users").updateOne(
          { id: req.user.id, "saved_addresses.0": { $exists: true } },
          { $set: { "saved_addresses.0.is_default": true } }
        );
      }
    }

    res.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({ detail: "Error deleting address" });
  }
});

// 2.6 Set Default Address
app.put("/api/addresses/:addressId/default", authMiddleware, async (req, res) => {
  try {
    const address = req.user.saved_addresses?.find((a) => a.id === req.params.addressId);
    if (!address) {
      return res.status(404).json({ detail: "Address not found" });
    }

    // Unset all defaults
    await db.collection("users").updateOne(
      { id: req.user.id },
      { $set: { "saved_addresses.$[].is_default": false } }
    );

    // Set this address as default
    await db.collection("users").updateOne(
      { id: req.user.id, "saved_addresses.id": req.params.addressId },
      { $set: { "saved_addresses.$.is_default": true } }
    );

    res.json({ message: "Default address updated successfully" });
  } catch (error) {
    console.error("Error setting default address:", error);
    res.status(500).json({ detail: "Error setting default address" });
  }
});

// ========================================
// 3. LOYALTY POINTS SYSTEM
// ========================================

// 3.1 Get Loyalty Balance
app.get("/api/loyalty/balance", authMiddleware, async (req, res) => {
  const user = await db.collection("users").findOne({ id: req.user.id });
  
  const redeemableValue = (user.loyalty_points / POINTS_TO_POUNDS).toFixed(2);
  const pointsToNextReward = POINTS_TO_POUNDS - (user.loyalty_points % POINTS_TO_POUNDS);
  
  // Get tier based on total spent
  let tier = "Bronze";
  let tierBenefits = ["Earn 10 points per £1 spent"];
  
  if (user.total_spent >= 500) {
    tier = "Gold";
    tierBenefits = ["Earn 15 points per £1 spent", "Free delivery on orders over £20", "Early access to deals"];
  } else if (user.total_spent >= 200) {
    tier = "Silver";
    tierBenefits = ["Earn 12 points per £1 spent", "Birthday bonus points"];
  }

  res.json({
    points: user.loyalty_points || 0,
    redeemable_value: parseFloat(redeemableValue),
    points_to_next_reward: pointsToNextReward,
    tier,
    tier_benefits: tierBenefits,
    total_earned: user.total_points_earned || 0,
    total_redeemed: user.total_points_redeemed || 0,
  });
});

// 3.2 Get Loyalty History
app.get("/api/loyalty/history", authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { user_id: req.user.id };
    if (type) {
      filter.type = type;
    }

    const transactions = await db
      .collection("loyalty_transactions")
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("loyalty_transactions").countDocuments(filter);

    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting loyalty history:", error);
    res.status(500).json({ detail: "Error getting loyalty history" });
  }
});

// 3.3 Redeem Points
app.post("/api/loyalty/redeem", authMiddleware, async (req, res) => {
  try {
    const { points_to_redeem } = req.body;

    if (!points_to_redeem || points_to_redeem < POINTS_TO_POUNDS) {
      return res.status(400).json({ detail: `Minimum ${POINTS_TO_POUNDS} points required to redeem` });
    }

    const user = await db.collection("users").findOne({ id: req.user.id });

    if (user.loyalty_points < points_to_redeem) {
      return res.status(400).json({ detail: "Insufficient points" });
    }

    // Round down to nearest redeemable amount
    const redeemablePoints = Math.floor(points_to_redeem / POINTS_TO_POUNDS) * POINTS_TO_POUNDS;
    const discountValue = redeemablePoints / POINTS_TO_POUNDS;
    const redemptionCode = `LOYALTY-${uuidv4().slice(0, 8).toUpperCase()}`;

    // Create discount code
    await db.collection("discount_codes").insertOne({
      id: uuidv4(),
      code: redemptionCode,
      user_id: req.user.id,
      type: "loyalty_redemption",
      discount_type: "fixed",
      discount_amount: discountValue,
      min_order_amount: discountValue + 5, // Minimum order must be higher than discount
      max_uses: 1,
      uses: 0,
      is_active: true,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: new Date(),
    });

    // Deduct points
    await db.collection("users").updateOne(
      { id: req.user.id },
      {
        $inc: {
          loyalty_points: -redeemablePoints,
          total_points_redeemed: redeemablePoints,
        },
      }
    );

    // Log transaction
    await db.collection("loyalty_transactions").insertOne({
      id: uuidv4(),
      user_id: req.user.id,
      type: "redemption",
      points: -redeemablePoints,
      description: `Redeemed ${redeemablePoints} points for £${discountValue} discount`,
      discount_code: redemptionCode,
      created_at: new Date(),
    });

    res.json({
      message: "Points redeemed successfully",
      redemption_code: redemptionCode,
      points_redeemed: redeemablePoints,
      discount_value: discountValue,
      remaining_points: user.loyalty_points - redeemablePoints,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
  } catch (error) {
    console.error("Error redeeming points:", error);
    res.status(500).json({ detail: "Error redeeming points" });
  }
});

// 3.4 Get Available Rewards
app.get("/api/loyalty/rewards", authMiddleware, async (req, res) => {
  const user = await db.collection("users").findOne({ id: req.user.id });
  const points = user.loyalty_points || 0;

  const rewards = [
    {
      id: "1",
      name: "£1 Off",
      points_required: 100,
      description: "Get £1 off your next order",
      is_available: points >= 100,
    },
    {
      id: "2",
      name: "£5 Off",
      points_required: 500,
      description: "Get £5 off your next order",
      is_available: points >= 500,
    },
    {
      id: "3",
      name: "£10 Off",
      points_required: 1000,
      description: "Get £10 off your next order",
      is_available: points >= 1000,
    },
    {
      id: "4",
      name: "Free Chai",
      points_required: 150,
      description: "Redeem for a free Karak Chai",
      is_available: points >= 150,
    },
    {
      id: "5",
      name: "Free Naan",
      points_required: 200,
      description: "Redeem for a free Butter Naan",
      is_available: points >= 200,
    },
    {
      id: "6",
      name: "Free Delivery",
      points_required: 250,
      description: "Get free delivery on your next order",
      is_available: points >= 250,
    },
  ];

  res.json({
    current_points: points,
    rewards,
  });
});

// ========================================
// 4. ORDER REVIEWS & RATINGS
// ========================================

// 4.1 Submit Review
app.post("/api/orders/:orderId/review", authMiddleware, async (req, res) => {
  try {
    const {
      overall_rating,
      food_rating,
      delivery_rating,
      service_rating,
      comment,
      item_ratings, // Array of { item_id, rating, comment }
      would_recommend,
      images, // Array of image URLs
    } = req.body;

    // Validation
    if (!overall_rating || overall_rating < 1 || overall_rating > 5) {
      return res.status(400).json({ detail: "Overall rating (1-5) is required" });
    }

    const order = await db.collection("orders").findOne({ id: req.params.orderId });
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ detail: "You can only review your own orders" });
    }

    if (order.is_reviewed) {
      return res.status(400).json({ detail: "Order has already been reviewed" });
    }

    // Check if order is completed
    if (!["delivered", "completed"].includes(order.status)) {
      return res.status(400).json({ detail: "Can only review completed orders" });
    }

    const review = {
      id: uuidv4(),
      order_id: req.params.orderId,
      user_id: req.user.id,
      user_name: req.user.name,
      store_id: order.store_id,
      overall_rating,
      food_rating: food_rating || null,
      delivery_rating: delivery_rating || null,
      service_rating: service_rating || null,
      comment: comment?.trim() || null,
      item_ratings: item_ratings || [],
      would_recommend: would_recommend !== undefined ? would_recommend : null,
      images: images || [],
      is_verified_purchase: true,
      is_visible: true,
      helpful_count: 0,
      created_at: new Date(),
    };

    await db.collection("reviews").insertOne(review);

    // Mark order as reviewed
    await db.collection("orders").updateOne(
      { id: req.params.orderId },
      { $set: { is_reviewed: true, review_id: review.id } }
    );

    // Award bonus points for review
    const bonusPoints = images && images.length > 0 ? 50 : 25;
    await db.collection("users").updateOne(
      { id: req.user.id },
      { $inc: { loyalty_points: bonusPoints } }
    );

    await db.collection("loyalty_transactions").insertOne({
      id: uuidv4(),
      user_id: req.user.id,
      type: "review_bonus",
      points: bonusPoints,
      description: `Bonus points for leaving a review${images?.length ? " with photos" : ""}`,
      order_id: req.params.orderId,
      created_at: new Date(),
    });

    res.status(201).json({
      message: "Review submitted successfully",
      review,
      bonus_points_earned: bonusPoints,
    });
  } catch (error) {
    console.error("Error submitting review:", error);
    res.status(500).json({ detail: "Error submitting review" });
  }
});

// 4.2 Get Store Reviews
app.get("/api/stores/:storeId/reviews", async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "recent", rating } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { store_id: req.params.storeId, is_visible: true };
    if (rating) {
      filter.overall_rating = parseInt(rating);
    }

    let sortOption = { created_at: -1 };
    if (sort === "highest") {
      sortOption = { overall_rating: -1, created_at: -1 };
    } else if (sort === "lowest") {
      sortOption = { overall_rating: 1, created_at: -1 };
    } else if (sort === "helpful") {
      sortOption = { helpful_count: -1, created_at: -1 };
    }

    const reviews = await db
      .collection("reviews")
      .find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("reviews").countDocuments(filter);

    // Calculate rating breakdown
    const allReviews = await db
      .collection("reviews")
      .find({ store_id: req.params.storeId, is_visible: true })
      .toArray();

    const ratingBreakdown = {
      5: allReviews.filter((r) => r.overall_rating === 5).length,
      4: allReviews.filter((r) => r.overall_rating === 4).length,
      3: allReviews.filter((r) => r.overall_rating === 3).length,
      2: allReviews.filter((r) => r.overall_rating === 2).length,
      1: allReviews.filter((r) => r.overall_rating === 1).length,
    };

    const averageRating = allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.overall_rating, 0) / allReviews.length
      : 0;

    const averageFoodRating = allReviews.filter((r) => r.food_rating).length > 0
      ? allReviews.filter((r) => r.food_rating).reduce((sum, r) => sum + r.food_rating, 0) /
        allReviews.filter((r) => r.food_rating).length
      : 0;

    const averageDeliveryRating = allReviews.filter((r) => r.delivery_rating).length > 0
      ? allReviews.filter((r) => r.delivery_rating).reduce((sum, r) => sum + r.delivery_rating, 0) /
        allReviews.filter((r) => r.delivery_rating).length
      : 0;

    res.json({
      reviews,
      summary: {
        average_rating: parseFloat(averageRating.toFixed(1)),
        average_food_rating: parseFloat(averageFoodRating.toFixed(1)),
        average_delivery_rating: parseFloat(averageDeliveryRating.toFixed(1)),
        total_reviews: allReviews.length,
        rating_breakdown: ratingBreakdown,
        recommendation_rate: allReviews.filter((r) => r.would_recommend).length / allReviews.length * 100 || 0,
      },
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting store reviews:", error);
    res.status(500).json({ detail: "Error getting store reviews" });
  }
});

// 4.3 Get Menu Item Reviews
app.get("/api/menu/items/:itemId/reviews", async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Find reviews that have rated this specific item
    const reviews = await db
      .collection("reviews")
      .find({
        "item_ratings.item_id": req.params.itemId,
        is_visible: true,
      })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    // Extract item-specific ratings
    const itemReviews = reviews.map((review) => {
      const itemRating = review.item_ratings.find((ir) => ir.item_id === req.params.itemId);
      return {
        id: review.id,
        user_name: review.user_name,
        rating: itemRating?.rating,
        comment: itemRating?.comment,
        created_at: review.created_at,
      };
    });

    const total = await db.collection("reviews").countDocuments({
      "item_ratings.item_id": req.params.itemId,
      is_visible: true,
    });

    res.json({
      reviews: itemReviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting item reviews:", error);
    res.status(500).json({ detail: "Error getting item reviews" });
  }
});

// 4.4 Mark Review as Helpful
app.post("/api/reviews/:reviewId/helpful", authMiddleware, async (req, res) => {
  try {
    const review = await db.collection("reviews").findOne({ id: req.params.reviewId });
    if (!review) {
      return res.status(404).json({ detail: "Review not found" });
    }

    // Check if user already marked this as helpful
    const existingMark = await db.collection("review_helpful").findOne({
      review_id: req.params.reviewId,
      user_id: req.user.id,
    });

    if (existingMark) {
      return res.status(400).json({ detail: "You already marked this review as helpful" });
    }

    await db.collection("review_helpful").insertOne({
      id: uuidv4(),
      review_id: req.params.reviewId,
      user_id: req.user.id,
      created_at: new Date(),
    });

    await db.collection("reviews").updateOne(
      { id: req.params.reviewId },
      { $inc: { helpful_count: 1 } }
    );

    res.json({ message: "Marked as helpful" });
  } catch (error) {
    console.error("Error marking review as helpful:", error);
    res.status(500).json({ detail: "Error marking review as helpful" });
  }
});

// 4.5 Get User's Reviews
app.get("/api/auth/reviews", authMiddleware, async (req, res) => {
  try {
    const reviews = await db
      .collection("reviews")
      .find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .toArray();

    res.json(reviews);
  } catch (error) {
    console.error("Error getting user reviews:", error);
    res.status(500).json({ detail: "Error getting user reviews" });
  }
});

// ========================================
// 5. SCHEDULED ORDERS
// ========================================

// 5.1 Create Scheduled Order
app.post("/api/orders/schedule", authMiddleware, async (req, res) => {
  try {
    const {
      cart_id,
      scheduled_date,
      scheduled_time,
      delivery_address,
      store_id,
      order_type,
      payment_method = "cash",
      special_instructions = "",
      discount_code,
    } = req.body;

    // Validation
    if (!scheduled_date || !scheduled_time) {
      return res.status(400).json({ detail: "Scheduled date and time are required" });
    }

    const cart = await db.collection("carts").findOne({ id: cart_id });
    if (!cart) {
      return res.status(404).json({ detail: "Cart not found" });
    }

    if (!cart.items || cart.items.length === 0) {
      return res.status(400).json({ detail: "Cart is empty" });
    }

    const scheduledDateTime = new Date(`${scheduled_date}T${scheduled_time}`);
    const now = new Date();

    // Must be at least 2 hours in advance
    const minScheduleTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (scheduledDateTime < minScheduleTime) {
      return res.status(400).json({ detail: "Scheduled time must be at least 2 hours in advance" });
    }

    // Cannot schedule more than 7 days ahead
    const maxScheduleTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (scheduledDateTime > maxScheduleTime) {
      return res.status(400).json({ detail: "Cannot schedule more than 7 days in advance" });
    }

    // Check store hours for scheduled time
    const store = STORES.find((s) => s.id === store_id);
    if (!store) {
      return res.status(404).json({ detail: "Store not found" });
    }

    const dayOfWeek = scheduledDateTime.toLocaleDateString("en-US", { weekday: "long" });
    const storeHours = store.hours.find((h) => h.day === dayOfWeek);
    if (storeHours?.is_closed) {
      return res.status(400).json({ detail: `Store is closed on ${dayOfWeek}` });
    }

    // Apply discount code if provided
    let discountAmount = 0;
    let appliedDiscount = null;
    if (discount_code) {
      const discountResult = await applyDiscountCode(discount_code, cart.subtotal, req.user.id);
      if (discountResult.error) {
        return res.status(400).json({ detail: discountResult.error });
      }
      discountAmount = discountResult.discount;
      appliedDiscount = discountResult.code;
    }

    const deliveryFee = order_type === "delivery" ? cart.delivery_fee : 0;
    const total = cart.subtotal - discountAmount + deliveryFee;

    const order = {
      id: uuidv4(),
      user_id: req.user.id,
      cart_id,
      customer_name: req.user.name,
      customer_phone: req.user.phone,
      customer_email: req.user.email,
      delivery_address: order_type === "delivery" ? delivery_address : null,
      store_id,
      order_type,
      items: cart.items,
      subtotal: cart.subtotal,
      discount_amount: discountAmount,
      discount_code: appliedDiscount?.code || null,
      delivery_fee: deliveryFee,
      total,
      payment_method,
      special_instructions,
      status: "scheduled",
      is_scheduled: true,
      scheduled_for: scheduledDateTime,
      estimated_time: null, // Will be set when order starts processing
      status_history: [
        {
          status: "scheduled",
          label: "Order Scheduled",
          timestamp: new Date(),
        },
      ],
      created_at: new Date(),
    };

    await db.collection("orders").insertOne(order);
    await db.collection("carts").deleteOne({ id: cart_id });

    // Mark discount code as used
    if (appliedDiscount) {
      await db.collection("discount_codes").updateOne(
        { id: appliedDiscount.id },
        { $inc: { uses: 1 } }
      );
    }

    res.status(201).json({
      message: "Order scheduled successfully",
      order,
    });
  } catch (error) {
    console.error("Error scheduling order:", error);
    res.status(500).json({ detail: "Error scheduling order" });
  }
});

// 5.2 Get Scheduled Orders
app.get("/api/orders/scheduled", authMiddleware, async (req, res) => {
  try {
    const orders = await db
      .collection("orders")
      .find({
        user_id: req.user.id,
        is_scheduled: true,
        status: "scheduled",
        scheduled_for: { $gte: new Date() },
      })
      .sort({ scheduled_for: 1 })
      .toArray();

    res.json(orders);
  } catch (error) {
    console.error("Error getting scheduled orders:", error);
    res.status(500).json({ detail: "Error getting scheduled orders" });
  }
});

// 5.3 Cancel Scheduled Order
app.delete("/api/orders/scheduled/:orderId", authMiddleware, async (req, res) => {
  try {
    const order = await db.collection("orders").findOne({ id: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ detail: "Not authorized" });
    }

    if (order.status !== "scheduled") {
      return res.status(400).json({ detail: "Can only cancel scheduled orders" });
    }

    // Can only cancel if more than 1 hour before scheduled time
    const cancelDeadline = new Date(order.scheduled_for.getTime() - 60 * 60 * 1000);
    if (new Date() > cancelDeadline) {
      return res.status(400).json({ detail: "Cannot cancel within 1 hour of scheduled time" });
    }

    await db.collection("orders").updateOne(
      { id: req.params.orderId },
      {
        $set: {
          status: "cancelled",
          cancelled_at: new Date(),
          cancellation_reason: "Cancelled by customer",
        },
        $push: {
          status_history: {
            status: "cancelled",
            label: "Order Cancelled",
            timestamp: new Date(),
          },
        },
      }
    );

    // Refund discount code if used
    if (order.discount_code) {
      await db.collection("discount_codes").updateOne(
        { code: order.discount_code },
        { $inc: { uses: -1 } }
      );
    }

    res.json({ message: "Scheduled order cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling scheduled order:", error);
    res.status(500).json({ detail: "Error cancelling scheduled order" });
  }
});

// 5.4 Modify Scheduled Order
app.put("/api/orders/scheduled/:orderId", authMiddleware, async (req, res) => {
  try {
    const { scheduled_date, scheduled_time } = req.body;

    const order = await db.collection("orders").findOne({ id: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ detail: "Not authorized" });
    }

    if (order.status !== "scheduled") {
      return res.status(400).json({ detail: "Can only modify scheduled orders" });
    }

    // Can only modify if more than 2 hours before scheduled time
    const modifyDeadline = new Date(order.scheduled_for.getTime() - 2 * 60 * 60 * 1000);
    if (new Date() > modifyDeadline) {
      return res.status(400).json({ detail: "Cannot modify within 2 hours of scheduled time" });
    }

    const newScheduledDateTime = new Date(`${scheduled_date}T${scheduled_time}`);
    const now = new Date();
    const minScheduleTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    if (newScheduledDateTime < minScheduleTime) {
      return res.status(400).json({ detail: "New scheduled time must be at least 2 hours in advance" });
    }

    await db.collection("orders").updateOne(
      { id: req.params.orderId },
      {
        $set: {
          scheduled_for: newScheduledDateTime,
          updated_at: new Date(),
        },
        $push: {
          status_history: {
            status: "rescheduled",
            label: "Order Rescheduled",
            timestamp: new Date(),
            new_time: newScheduledDateTime,
          },
        },
      }
    );

    res.json({ message: "Scheduled order updated successfully" });
  } catch (error) {
    console.error("Error modifying scheduled order:", error);
    res.status(500).json({ detail: "Error modifying scheduled order" });
  }
});

// ========================================
// 6. REORDER FUNCTIONALITY
// ========================================

// 6.1 Reorder Past Order
app.post("/api/orders/:orderId/reorder", authMiddleware, async (req, res) => {
  try {
    const order = await db.collection("orders").findOne({ id: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ detail: "Not authorized" });
    }

    // Check if items are still available
    const unavailableItems = [];
    const availableItems = [];

    for (const item of order.items) {
      const menuItem = MENU_ITEMS.find((m) => m.id === item.item_id);
      if (menuItem) {
        availableItems.push({
          ...item,
          price: menuItem.price, // Use current price
          current_price_different: menuItem.price !== item.price,
        });
      } else {
        unavailableItems.push(item);
      }
    }

    if (availableItems.length === 0) {
      return res.status(400).json({ detail: "None of the items from this order are currently available" });
    }

    // Create new cart with available items
    const subtotal = availableItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    
    const newCart = {
      id: uuidv4(),
      user_id: req.user.id,
      items: availableItems.map((item) => ({
        item_id: item.item_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        customizations: item.customizations || [],
        special_instructions: item.special_instructions || "",
      })),
      delivery_fee: 2.5,
      subtotal,
      total: subtotal + 2.5,
      reorder_from: order.id,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await db.collection("carts").insertOne(newCart);

    res.json({
      message: "Cart created from previous order",
      cart: newCart,
      unavailable_items: unavailableItems,
      price_changes: availableItems.filter((item) => item.current_price_different).map((item) => ({
        name: item.name,
        old_price: order.items.find((o) => o.item_id === item.item_id)?.price,
        new_price: item.price,
      })),
    });
  } catch (error) {
    console.error("Error reordering:", error);
    res.status(500).json({ detail: "Error reordering" });
  }
});

// 6.2 Quick Reorder (add all items directly to cart)
app.post("/api/orders/:orderId/quick-reorder", authMiddleware, async (req, res) => {
  try {
    const { existing_cart_id } = req.body;
    
    const order = await db.collection("orders").findOne({ id: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    if (order.user_id !== req.user.id) {
      return res.status(403).json({ detail: "Not authorized" });
    }

    let cart;
    if (existing_cart_id) {
      cart = await db.collection("carts").findOne({ id: existing_cart_id });
    }

    if (!cart) {
      cart = {
        id: uuidv4(),
        user_id: req.user.id,
        items: [],
        delivery_fee: 2.5,
        subtotal: 0,
        total: 2.5,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    // Add items from order to cart
    for (const orderItem of order.items) {
      const menuItem = MENU_ITEMS.find((m) => m.id === orderItem.item_id);
      if (!menuItem) continue;

      const existingItemIndex = cart.items.findIndex(
        (item) =>
          item.item_id === orderItem.item_id &&
          JSON.stringify(item.customizations) === JSON.stringify(orderItem.customizations || [])
      );

      if (existingItemIndex !== -1) {
        cart.items[existingItemIndex].quantity += orderItem.quantity;
      } else {
        cart.items.push({
          item_id: orderItem.item_id,
          name: orderItem.name,
          price: menuItem.price,
          quantity: orderItem.quantity,
          customizations: orderItem.customizations || [],
          special_instructions: orderItem.special_instructions || "",
        });
      }
    }

    // Recalculate totals
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    cart.total = cart.subtotal + cart.delivery_fee;
    cart.updated_at = new Date();

    await db.collection("carts").updateOne(
      { id: cart.id },
      { $set: cart },
      { upsert: true }
    );

    res.json({
      message: "Items added to cart",
      cart,
    });
  } catch (error) {
    console.error("Error quick reordering:", error);
    res.status(500).json({ detail: "Error quick reordering" });
  }
});

// ========================================
// 7. ORDER HISTORY
// ========================================

// 7.1 Get Order History
app.get("/api/orders/history", authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      from_date,
      to_date,
      order_type,
      store_id,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const filter = { user_id: req.user.id };

    if (status) {
      filter.status = status;
    }
    if (order_type) {
      filter.order_type = order_type;
    }
    if (store_id) {
      filter.store_id = store_id;
    }
    if (from_date || to_date) {
      filter.created_at = {};
      if (from_date) {
        filter.created_at.$gte = new Date(from_date);
      }
      if (to_date) {
        filter.created_at.$lte = new Date(to_date);
      }
    }

    const orders = await db
      .collection("orders")
      .find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();

    const total = await db.collection("orders").countDocuments(filter);

    // Add store info to each order
    const ordersWithStoreInfo = orders.map((order) => {
      const store = STORES.find((s) => s.id === order.store_id);
      return {
        ...order,
        store_name: store?.name || "Unknown Store",
        store_address: store?.address || "",
      };
    });

    // Calculate summary statistics
    const allUserOrders = await db.collection("orders").find({ user_id: req.user.id }).toArray();
    const summary = {
      total_orders: allUserOrders.length,
      total_spent: allUserOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      average_order_value: allUserOrders.length > 0
        ? allUserOrders.reduce((sum, o) => sum + (o.total || 0), 0) / allUserOrders.length
        : 0,
      favorite_store: getMostFrequentStore(allUserOrders),
      favorite_items: getMostOrderedItems(allUserOrders),
    };

    res.json({
      orders: ordersWithStoreInfo,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error getting order history:", error);
    res.status(500).json({ detail: "Error getting order history" });
  }
});

// Helper function to get most frequent store
const getMostFrequentStore = (orders) => {
  const storeCounts = {};
  orders.forEach((order) => {
    storeCounts[order.store_id] = (storeCounts[order.store_id] || 0) + 1;
  });
  
  const mostFrequentStoreId = Object.keys(storeCounts).reduce((a, b) =>
    storeCounts[a] > storeCounts[b] ? a : b, null);
  
  if (!mostFrequentStoreId) return null;
  
  const store = STORES.find((s) => s.id === mostFrequentStoreId);
  return store ? { id: store.id, name: store.name, order_count: storeCounts[mostFrequentStoreId] } : null;
};

// Helper function to get most ordered items
const getMostOrderedItems = (orders) => {
  const itemCounts = {};
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      itemCounts[item.item_id] = {
        count: (itemCounts[item.item_id]?.count || 0) + item.quantity,
        name: item.name,
      };
    });
  });
  
  return Object.entries(itemCounts)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id, data]) => ({ item_id: id, name: data.name, times_ordered: data.count }));
};

// 7.2 Get Order Details
app.get("/api/orders/:orderId", optionalAuthMiddleware, async (req, res) => {
  try {
    const order = await db.collection("orders").findOne({ id: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    // If authenticated, verify ownership for full details
    const isOwner = req.user && order.user_id === req.user.id;

    // Get store info
    const store = STORES.find((s) => s.id === order.store_id);

    // Get review if exists
    const review = order.is_reviewed
      ? await db.collection("reviews").findOne({ order_id: order.id })
      : null;

    res.json({
      ...order,
      store_name: store?.name || "Unknown Store",
      store_address: store?.address || "",
      store_phone: store?.phone || "",
      review: isOwner ? review : null,
      can_review: isOwner && !order.is_reviewed && ["delivered", "completed"].includes(order.status),
      can_reorder: isOwner,
    });
  } catch (error) {
    console.error("Error getting order details:", error);
    res.status(500).json({ detail: "Error getting order details" });
  }
});

// ========================================
// 8. REAL-TIME ORDER STATUS
// ========================================

// 8.1 Get Order Status
app.get("/api/orders/:orderId/status", async (req, res) => {
  try {
    const order = await db.collection("orders").findOne({ id: req.params.orderId });
    
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    const currentStatusIndex = ORDER_STATUSES.findIndex((s) => s.status === order.status);
    const currentStatus = ORDER_STATUSES[currentStatusIndex];

    // Calculate remaining time
    const remainingTime = ORDER_STATUSES.slice(currentStatusIndex)
      .reduce((sum, s) => sum + s.duration, 0);

    // Build status timeline
    const timeline = ORDER_STATUSES.filter((s) => 
      !["pending", "cancelled"].includes(s.status)
    ).map((s, index) => {
      const historyEntry = order.status_history?.find((h) => h.status === s.status);
      const statusIndex = ORDER_STATUSES.findIndex((os) => os.status === s.status);
      
      return {
        status: s.status,
        label: s.label,
        is_completed: statusIndex < currentStatusIndex,
        is_current: s.status === order.status,
        is_upcoming: statusIndex > currentStatusIndex,
        timestamp: historyEntry?.timestamp || null,
      };
    });

    res.json({
      order_id: order.id,
      status: order.status,
      status_label: currentStatus?.label || order.status,
      estimated_time: remainingTime,
      order_type: order.order_type,
      store_id: order.store_id,
      store_name: STORES.find((s) => s.id === order.store_id)?.name || "Unknown",
      timeline,
      last_updated: order.updated_at || order.created_at,
      delivery_address: order.order_type === "delivery" ? order.delivery_address : null,
      driver_info: order.driver_info || null,
    });
  } catch (error) {
    console.error("Error getting order status:", error);
    res.status(500).json({ detail: "Error getting order status" });
  }
});

// 8.2 Update Order Status (Admin/Store use)
app.put("/api/orders/:orderId/status", async (req, res) => {
  try {
    const { status, estimated_time, driver_info } = req.body;

    const validStatuses = ORDER_STATUSES.map((s) => s.status);
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ detail: "Invalid status" });
    }

    const order = await db.collection("orders").findOne({ id: req.params.orderId });
    if (!order) {
      return res.status(404).json({ detail: "Order not found" });
    }

    const statusInfo = ORDER_STATUSES.find((s) => s.status === status);
    const currentIndex = ORDER_STATUSES.findIndex((s) => s.status === status);
    const remainingTime = estimated_time || ORDER_STATUSES.slice(currentIndex)
      .reduce((sum, s) => sum + s.duration, 0);

    const updates = {
      status,
      status_label: statusInfo.label,
      estimated_time: remainingTime,
      updated_at: new Date(),
    };

    if (driver_info) {
      updates.driver_info = driver_info;
    }

    if (status === "delivered" || status === "completed") {
      updates.completed_at = new Date();
      
      // Award loyalty points
      if (order.user_id) {
        const pointsEarned = calculateLoyaltyPoints(order.total);
        await db.collection("users").updateOne(
          { id: order.user_id },
          {
            $inc: {
              loyalty_points: pointsEarned,
              total_points_earned: pointsEarned,
              total_orders: 1,
              total_spent: order.total,
            },
          }
        );

        await db.collection("loyalty_transactions").insertOne({
          id: uuidv4(),
          user_id: order.user_id,
          type: "order_points",
          points: pointsEarned,
          description: `Points earned from order #${order.id.slice(0, 8)}`,
          order_id: order.id,
          created_at: new Date(),
        });
      }
    }

    await db.collection("orders").updateOne(
      { id: req.params.orderId },
      {
        $set: updates,
        $push: {
          status_history: {
            status,
            label: statusInfo.label,
            timestamp: new Date(),
          },
        },
      }
    );

    res.json({
      message: "Status updated successfully",
      new_status: status,
      estimated_time: remainingTime,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ detail: "Error updating order status" });
  }
});

// ========================================
// 9. REFERRAL PROGRAM
// ========================================

// 9.1 Get Referral Info
app.get("/api/referral", authMiddleware, async (req, res) => {
  const user = await db.collection("users").findOne({ id: req.user.id });

  // Count successful referrals
  const referralCount = await db.collection("users").countDocuments({
    referred_by: user.referral_code,
  });

  // Get referral history
  const referrals = await db.collection("users")
    .find({ referred_by: user.referral_code })
    .project({ name: 1, created_at: 1 })
    .sort({ created_at: -1 })
    .limit(10)
    .toArray();

  const totalPointsEarned = referralCount * REFERRAL_BONUS_REFERRER;

  res.json({
    referral_code: user.referral_code,
    referral_link: `https://naanstaap.com/signup?ref=${user.referral_code}`,
    referral_count: referralCount,
    total_points_earned: totalPointsEarned,
    reward_per_referral: REFERRAL_BONUS_REFERRER,
    referee_bonus: REFERRAL_BONUS_REFEREE,
    recent_referrals: referrals.map((r) => ({
      name: r.name,
      joined_at: r.created_at,
    })),
    share_message: `Join me on Naan Staap and get ${REFERRAL_BONUS_REFEREE} bonus points! Use my code: ${user.referral_code}`,
  });
});

// 9.2 Apply Referral Code (for users who didn't use one at signup)
app.post("/api/referral/apply", authMiddleware, async (req, res) => {
  try {
    const { referral_code } = req.body;

    if (!referral_code) {
      return res.status(400).json({ detail: "Referral code is required" });
    }

    const user = await db.collection("users").findOne({ id: req.user.id });

    if (user.referred_by) {
      return res.status(400).json({ detail: "You have already used a referral code" });
    }

    // Check if user has made any orders (can only apply before first order)
    const orderCount = await db.collection("orders").countDocuments({ user_id: req.user.id });
    if (orderCount > 0) {
      return res.status(400).json({ detail: "Referral code can only be applied before your first order" });
    }

    const referrer = await db.collection("users").findOne({
      referral_code: referral_code.toUpperCase(),
    });

    if (!referrer) {
      return res.status(404).json({ detail: "Invalid referral code" });
    }

    if (referrer.id === req.user.id) {
      return res.status(400).json({ detail: "You cannot use your own referral code" });
    }

    // Apply referral
    await db.collection("users").updateOne(
      { id: req.user.id },
      {
        $set: { referred_by: referral_code.toUpperCase() },
        $inc: { loyalty_points: REFERRAL_BONUS_REFEREE },
      }
    );

    await db.collection("users").updateOne(
      { id: referrer.id },
      { $inc: { loyalty_points: REFERRAL_BONUS_REFERRER } }
    );

    // Log transactions
    await db.collection("loyalty_transactions").insertOne({
      id: uuidv4(),
      user_id: req.user.id,
      type: "referral_bonus",
      points: REFERRAL_BONUS_REFEREE,
      description: "Welcome bonus for using referral code",
      created_at: new Date(),
    });

    await db.collection("loyalty_transactions").insertOne({
      id: uuidv4(),
      user_id: referrer.id,
      type: "referral_bonus",
      points: REFERRAL_BONUS_REFERRER,
      description: `Referral bonus - ${req.user.name} joined using your code`,
      created_at: new Date(),
    });

    res.json({
      message: `Referral code applied! You earned ${REFERRAL_BONUS_REFEREE} points.`,
      points_earned: REFERRAL_BONUS_REFEREE,
    });
  } catch (error) {
    console.error("Error applying referral:", error);
    res.status(500).json({ detail: "Error applying referral code" });
  }
});

// 9.3 Validate Referral Code
app.get("/api/referral/validate/:code", async (req, res) => {
  try {
    const referrer = await db.collection("users").findOne({
      referral_code: req.params.code.toUpperCase(),
    });

    if (!referrer) {
      return res.status(404).json({ valid: false, detail: "Invalid referral code" });
    }

    res.json({
      valid: true,
      referrer_name: referrer.name.split(" ")[0], // First name only for privacy
      bonus_points: REFERRAL_BONUS_REFEREE,
    });
  } catch (error) {
    console.error("Error validating referral:", error);
    res.status(500).json({ detail: "Error validating referral code" });
  }
});

// ========================================
// 10. MENU FILTERS & PERSONALIZATION
// ========================================

// 10.1 Advanced Menu Filter
app.get("/api/menu/items/filter", optionalAuthMiddleware, async (req, res) => {
  try {
    let items = [...MENU_ITEMS];

    const {
      category,
      vegetarian,
      vegan,
      halal,
      spicy,
      not_spicy,
      max_calories,
      min_calories,
      exclude_allergens,
      include_allergens,
      min_price,
      max_price,
      popular,
      search,
      sort_by,
      sort_order = "asc",
    } = req.query;

    // Category filter
    if (category) {
      const categories = category.split(",");
      items = items.filter((item) => categories.includes(item.category));
    }

    // Dietary filters
    if (vegetarian === "true") {
      items = items.filter((item) => item.is_vegetarian);
    }
    if (spicy === "true") {
      items = items.filter((item) => item.is_spicy);
    }
    if (not_spicy === "true") {
      items = items.filter((item) => !item.is_spicy);
    }
    if (popular === "true") {
      items = items.filter((item) => item.is_popular);
    }

    // Calorie filters
    if (max_calories) {
      items = items.filter((item) => item.calories <= parseInt(max_calories));
    }
    if (min_calories) {
      items = items.filter((item) => item.calories >= parseInt(min_calories));
    }

    // Allergen filters
    if (exclude_allergens) {
      const allergenList = exclude_allergens.split(",").map((a) => a.trim());
      items = items.filter(
        (item) => !item.allergens.some((a) => allergenList.includes(a))
      );
    }

    // Price filters
    if (min_price) {
      items = items.filter((item) => item.price >= parseFloat(min_price));
    }
    if (max_price) {
      items = items.filter((item) => item.price <= parseFloat(max_price));
    }

    // Search
    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.description.toLowerCase().includes(searchLower)
      );
    }

    // Apply user preferences if authenticated
    if (req.user) {
      // Filter out items with user's allergen alerts
      if (req.user.allergen_alerts && req.user.allergen_alerts.length > 0) {
        items = items.map((item) => ({
          ...item,
          has_allergen_warning: item.allergens.some((a) =>
            req.user.allergen_alerts.includes(a)
          ),
        }));
      }

      // Mark vegetarian items if user has vegetarian preference
      if (req.user.dietary_preferences?.includes("vegetarian")) {
        items = items.map((item) => ({
          ...item,
          matches_dietary_preference: item.is_vegetarian,
        }));
      }
    }

    // Sorting
    if (sort_by) {
      items.sort((a, b) => {
        let comparison = 0;
        switch (sort_by) {
          case "price":
            comparison = a.price - b.price;
            break;
          case "name":
            comparison = a.name.localeCompare(b.name);
            break;
          case "calories":
            comparison = a.calories - b.calories;
            break;
          case "popular":
            comparison = (b.is_popular ? 1 : 0) - (a.is_popular ? 1 : 0);
            break;
          default:
            break;
        }
        return sort_order === "desc" ? -comparison : comparison;
      });
    }

    // Get category counts
    const categoryCounts = MENU_CATEGORIES.map((cat) => ({
      ...cat,
      filtered_count: items.filter((item) => item.category === cat.id).length,
    }));

    res.json({
      items,
      total_count: items.length,
      categories: categoryCounts,
      filters_applied: {
        category,
        vegetarian,
        spicy,
        max_calories,
        min_calories,
        exclude_allergens,
        min_price,
        max_price,
        search,
      },
    });
  } catch (error) {
    console.error("Error filtering menu:", error);
    res.status(500).json({ detail: "Error filtering menu" });
  }
});

// 10.2 Personalized Recommendations
app.get("/api/recommendations", authMiddleware, async (req, res) => {
  try {
    // Get user's order history
    const orders = await db
      .collection("orders")
      .find({ user_id: req.user.id })
      .sort({ created_at: -1 })
      .limit(20)
      .toArray();

    // Analyze ordering patterns
    const itemCounts = {};
    const categoryCounts = {};
    const timeOfDayOrders = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    orders.forEach((order) => {
      order.items?.forEach((item) => {
        itemCounts[item.item_id] = (itemCounts[item.item_id] || 0) + 1;
        const menuItem = MENU_ITEMS.find((m) => m.id === item.item_id);
        if (menuItem) {
          categoryCounts[menuItem.category] = (categoryCounts[menuItem.category] || 0) + 1;
        }
      });

      const hour = new Date(order.created_at).getHours();
      if (hour >= 6 && hour < 12) timeOfDayOrders.morning++;
      else if (hour >= 12 && hour < 17) timeOfDayOrders.afternoon++;
      else if (hour >= 17 && hour < 21) timeOfDayOrders.evening++;
      else timeOfDayOrders.night++;
    });

    // Get frequently ordered items
    const orderedItemIds = Object.keys(itemCounts);
    const frequentlyOrdered = MENU_ITEMS
      .filter((item) => orderedItemIds.includes(item.id))
      .sort((a, b) => (itemCounts[b.id] || 0) - (itemCounts[a.id] || 0))
      .slice(0, 5);

    // Get preferred categories
    const preferredCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat]) => cat);

    // Generate recommendations based on preferences
    let recommendations = MENU_ITEMS.filter((item) => {
      // Items from preferred categories that haven't been ordered
      return (
        preferredCategories.includes(item.category) &&
        !orderedItemIds.includes(item.id)
      );
    });

    // Apply user's dietary preferences
    if (req.user.dietary_preferences?.includes("vegetarian")) {
      recommendations = recommendations.filter((item) => item.is_vegetarian);
    }

    // Exclude items with user's allergens
    if (req.user.allergen_alerts?.length > 0) {
      recommendations = recommendations.filter(
        (item) => !item.allergens.some((a) => req.user.allergen_alerts.includes(a))
      );
    }

    // Limit and add popular items if needed
    recommendations = recommendations.slice(0, 6);
    if (recommendations.length < 6) {
      const popularItems = MENU_ITEMS.filter(
        (item) =>
          item.is_popular &&
          !orderedItemIds.includes(item.id) &&
          !recommendations.find((r) => r.id === item.id)
      );
      recommendations = [...recommendations, ...popularItems].slice(0, 6);
    }

    // Get time-based suggestions
    const currentHour = new Date().getHours();
    let timeSuggestion = "";
    let timeSuggestedItems = [];

    if (currentHour >= 6 && currentHour < 11) {
      timeSuggestion = "Perfect for breakfast";
      timeSuggestedItems = MENU_ITEMS.filter((item) =>
        ["paratha", "chai"].includes(item.category) || item.name.includes("Chai")
      ).slice(0, 3);
    } else if (currentHour >= 11 && currentHour < 15) {
      timeSuggestion = "Great for lunch";
      timeSuggestedItems = MENU_ITEMS.filter((item) =>
        ["curries", "naan"].includes(item.category)
      ).slice(0, 3);
    } else if (currentHour >= 15 && currentHour < 18) {
      timeSuggestion = "Afternoon snack time";
      timeSuggestedItems = MENU_ITEMS.filter((item) =>
        ["snacks", "street-food", "drinks"].includes(item.category)
      ).slice(0, 3);
    } else {
      timeSuggestion = "Perfect for dinner";
      timeSuggestedItems = MENU_ITEMS.filter((item) =>
        ["curries", "naan", "paratha"].includes(item.category)
      ).slice(0, 3);
    }

    res.json({
      for_you: recommendations,
      frequently_ordered: frequentlyOrdered,
      based_on_time: {
        suggestion: timeSuggestion,
        items: timeSuggestedItems,
      },
      try_something_new: MENU_ITEMS.filter(
        (item) => !orderedItemIds.includes(item.id) && item.is_popular
      ).slice(0, 4),
      preferred_categories: preferredCategories,
    });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({ detail: "Error getting recommendations" });
  }
});

// 10.3 Similar Items
app.get("/api/menu/items/:itemId/similar", async (req, res) => {
  try {
    const item = MENU_ITEMS.find((i) => i.id === req.params.itemId);
    if (!item) {
      return res.status(404).json({ detail: "Item not found" });
    }

    // Find similar items based on category, price range, and dietary attributes
    const similarItems = MENU_ITEMS.filter((i) => {
      if (i.id === item.id) return false;

      let score = 0;
      if (i.category === item.category) score += 3;
      if (Math.abs(i.price - item.price) <= 2) score += 2;
      if (i.is_vegetarian === item.is_vegetarian) score += 1;
      if (i.is_spicy === item.is_spicy) score += 1;

      return score >= 3;
    }).slice(0, 4);

    res.json({
      item_id: item.id,
      item_name: item.name,
      similar_items: similarItems,
    });
  } catch (error) {
    console.error("Error getting similar items:", error);
    res.status(500).json({ detail: "Error getting similar items" });
  }
});

// ========================================
// DISCOUNT CODE HELPER
// ========================================

const applyDiscountCode = async (code, subtotal, userId) => {
  const discountCode = await db.collection("discount_codes").findOne({
    code: code.toUpperCase(),
    is_active: true,
  });

  if (!discountCode) {
    return { error: "Invalid discount code" };
  }

  if (new Date() > new Date(discountCode.expires_at)) {
    return { error: "Discount code has expired" };
  }

  if (discountCode.max_uses && discountCode.uses >= discountCode.max_uses) {
    return { error: "Discount code has reached maximum uses" };
  }

  if (discountCode.user_id && discountCode.user_id !== userId) {
    return { error: "This discount code is not valid for your account" };
  }

  if (discountCode.min_order_amount && subtotal < discountCode.min_order_amount) {
    return { error: `Minimum order amount is £${discountCode.min_order_amount}` };
  }

  let discount = 0;
  if (discountCode.discount_type === "percentage") {
    discount = (subtotal * discountCode.discount_percentage) / 100;
    if (discountCode.max_discount_amount) {
      discount = Math.min(discount, discountCode.max_discount_amount);
    }
  } else {
    discount = discountCode.discount_amount;
  }

  return { discount, code: discountCode };
};

// ========================================
// CORE API ROUTES
// ========================================

// Health check routes
app.get("/api/", (req, res) => {
  res.json({ message: "Welcome to Naan Staap API", status: "healthy" });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", service: "Naan Staap API" });
});

// ========================================
// MENU ROUTES
// ========================================

// Get all menu categories
app.get("/api/menu/categories", (req, res) => {
  res.json(MENU_CATEGORIES);
});

// Get all menu items
app.get("/api/menu/items", (req, res) => {
  res.json(MENU_ITEMS);
});

// Get popular menu items
app.get("/api/menu/items/popular", (req, res) => {
  const popularItems = MENU_ITEMS.filter((item) => item.is_popular);
  res.json(popularItems);
});

// Get menu items by category
app.get("/api/menu/items/category/:categoryId", (req, res) => {
  const { categoryId } = req.params;
  const items = MENU_ITEMS.filter((item) => item.category === categoryId);
  res.json(items);
});

// Get single menu item
app.get("/api/menu/items/:itemId", (req, res) => {
  const { itemId } = req.params;
  const item = MENU_ITEMS.find((i) => i.id === itemId);
  if (!item) {
    return res.status(404).json({ detail: "Item not found" });
  }
  res.json(item);
});

// ========================================
// CHAI ROUTES
// ========================================

// Get all chai items
app.get("/api/chai", (req, res) => {
  res.json(CHAI_ITEMS);
});

// Get single chai item
app.get("/api/chai/:chaiId", (req, res) => {
  const { chaiId } = req.params;
  const chai = CHAI_ITEMS.find((c) => c.id === chaiId);
  if (!chai) {
    return res.status(404).json({ detail: "Chai not found" });
  }
  res.json(chai);
});

// ========================================
// STORES ROUTES
// ========================================

// Get all stores
app.get("/api/stores", (req, res) => {
  // Update is_open_now based on current time
  const now = new Date();
  const currentDay = now.toLocaleDateString("en-US", { weekday: "long" });
  const currentTime = now.toTimeString().slice(0, 5);

  const storesWithStatus = STORES.map((store) => {
    const todayHours = store.hours.find((h) => h.day === currentDay);
    let isOpen = false;
    if (todayHours && !todayHours.is_closed) {
      isOpen = currentTime >= todayHours.open_time && currentTime <= todayHours.close_time;
    }
    return { ...store, is_open_now: isOpen };
  });

  res.json(storesWithStatus);
});

// Get single store
app.get("/api/stores/:storeId", (req, res) => {
  const { storeId } = req.params;
  const store = STORES.find((s) => s.id === storeId);
  if (!store) {
    return res.status(404).json({ detail: "Store not found" });
  }
  res.json(store);
});

// ========================================
// DEALS ROUTES
// ========================================

// Get all active deals
app.get("/api/deals", (req, res) => {
  const now = new Date();
  const activeDeals = DEALS.filter((deal) => new Date(deal.valid_until) >= now);
  res.json(activeDeals);
});

// Get single deal
app.get("/api/deals/:dealId", (req, res) => {
  const { dealId } = req.params;
  const deal = DEALS.find((d) => d.id === dealId);
  if (!deal) {
    return res.status(404).json({ detail: "Deal not found" });
  }
  res.json(deal);
});

// ========================================
// CART ROUTES (In-Memory)
// ========================================

// Get cart
app.get("/api/cart/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const cart = carts.get(sessionId) || { items: [], total: 0 };
  res.json(cart);
});

// Add item to cart
app.post("/api/cart/:sessionId/add", (req, res) => {
  const { sessionId } = req.params;
  const { item_id, name, price, quantity, customizations, special_instructions, image_url } = req.body;

  let cart = carts.get(sessionId) || { items: [], total: 0 };

  // Check if item already exists with same customizations
  const existingIndex = cart.items.findIndex(
    (item) =>
      item.item_id === item_id &&
      JSON.stringify(item.customizations) === JSON.stringify(customizations)
  );

  if (existingIndex > -1) {
    cart.items[existingIndex].quantity += quantity;
  } else {
    cart.items.push({
      id: uuidv4(),
      item_id,
      name,
      price,
      quantity,
      customizations: customizations || [],
      special_instructions: special_instructions || "",
      image_url,
    });
  }

  cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  carts.set(sessionId, cart);

  res.json(cart);
});

// Update cart item quantity
app.put("/api/cart/:sessionId/item/:itemId", (req, res) => {
  const { sessionId, itemId } = req.params;
  const { quantity } = req.body;

  const cart = carts.get(sessionId);
  if (!cart) {
    return res.status(404).json({ detail: "Cart not found" });
  }

  const itemIndex = cart.items.findIndex((item) => item.id === itemId);
  if (itemIndex === -1) {
    return res.status(404).json({ detail: "Item not found in cart" });
  }

  if (quantity <= 0) {
    cart.items.splice(itemIndex, 1);
  } else {
    cart.items[itemIndex].quantity = quantity;
  }

  cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  carts.set(sessionId, cart);

  res.json(cart);
});

// Remove item from cart
app.delete("/api/cart/:sessionId/item/:itemId", (req, res) => {
  const { sessionId, itemId } = req.params;

  const cart = carts.get(sessionId);
  if (!cart) {
    return res.status(404).json({ detail: "Cart not found" });
  }

  cart.items = cart.items.filter((item) => item.id !== itemId);
  cart.total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  carts.set(sessionId, cart);

  res.json(cart);
});

// Clear cart
app.delete("/api/cart/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  carts.delete(sessionId);
  res.json({ message: "Cart cleared" });
});

// ========================================
// FAVORITES ROUTES (In-Memory)
// ========================================

// Get favorites
app.get("/api/favorites/:userId", (req, res) => {
  const { userId } = req.params;
  const userFavorites = favorites.get(userId) || [];
  res.json(userFavorites);
});

// Add to favorites
app.post("/api/favorites/:userId", (req, res) => {
  const { userId } = req.params;
  const { item_id, name, price, image_url } = req.body;

  let userFavorites = favorites.get(userId) || [];

  if (!userFavorites.find((f) => f.item_id === item_id)) {
    userFavorites.push({
      id: uuidv4(),
      item_id,
      name,
      price,
      image_url,
      added_at: new Date(),
    });
    favorites.set(userId, userFavorites);
  }

  res.json(userFavorites);
});

// Remove from favorites
app.delete("/api/favorites/:userId/:itemId", (req, res) => {
  const { userId, itemId } = req.params;

  let userFavorites = favorites.get(userId) || [];
  userFavorites = userFavorites.filter((f) => f.item_id !== itemId);
  favorites.set(userId, userFavorites);

  res.json(userFavorites);
});

// ========================================
// NEWSLETTER ROUTES
// ========================================

// Subscribe to newsletter
app.post("/api/newsletter/subscribe", (req, res) => {
  const { email } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ detail: "Valid email is required" });
  }

  if (newsletterSubscribers.find((s) => s.email === email.toLowerCase())) {
    return res.status(400).json({ detail: "Email already subscribed" });
  }

  newsletterSubscribers.push({
    id: uuidv4(),
    email: email.toLowerCase(),
    subscribed_at: new Date(),
    is_active: true,
  });

  res.json({ message: "Successfully subscribed to newsletter!" });
});

// Unsubscribe from newsletter
app.post("/api/newsletter/unsubscribe", (req, res) => {
  const { email } = req.body;

  const index = newsletterSubscribers.findIndex((s) => s.email === email.toLowerCase());
  if (index === -1) {
    return res.status(404).json({ detail: "Email not found in subscribers" });
  }

  newsletterSubscribers[index].is_active = false;
  res.json({ message: "Successfully unsubscribed from newsletter" });
});

// ========================================
// CONTACT ROUTES
// ========================================

// Submit contact form
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ detail: "Name, email, and message are required" });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ detail: "Invalid email format" });
    }

    const contactMessage = {
      id: uuidv4(),
      name,
      email,
      phone: phone || null,
      subject: subject || "General Inquiry",
      message,
      status: "new",
      created_at: new Date(),
    };

    if (db) {
      await db.collection("contact_messages").insertOne(contactMessage);
    }

    res.json({ message: "Thank you for your message! We'll get back to you soon." });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res.status(500).json({ detail: "Error submitting contact form" });
  }
});

// ========================================
// Connect to MongoDB and start server
// ========================================

const startServer = async () => {
  try {
    const client = new MongoClient(mongoUrl);
    await client.connect();
    console.log("Connected to MongoDB");
    db = client.db(dbName);

    // Create indexes for better performance
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("users").createIndex({ referral_code: 1 });
    await db.collection("orders").createIndex({ user_id: 1, created_at: -1 });
    await db.collection("reviews").createIndex({ store_id: 1, created_at: -1 });
    await db.collection("loyalty_transactions").createIndex({ user_id: 1, created_at: -1 });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });

    process.on("SIGINT", async () => {
      console.log("Shutting down...");
      await client.close();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("Shutting down...");
      await client.close();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  }
};

startServer();