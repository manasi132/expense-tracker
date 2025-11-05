import User from "../models/userSchema.js";
 // <-- make sure the path & casing match your file
// No need to import bcrypt here if your schema hashes in a pre-save hook

// Helper to strip password
const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject();
  delete user.password;
  return user;
};

// POST /api/auth/register
export const registerController = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Please enter all fields" });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    // Password is hashed by the schema's pre-save hook
    const newUser = await User.create({ name: name.trim(), email: email.toLowerCase(), password });

    // Generate JWT using schema method
    const token = newUser.generateJWT();

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      token,
      user: sanitizeUser(newUser),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/login
export const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Please enter all fields" });
    }

    // need +password because schema sets select:false
    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Incorrect email or password" });
    }

    const token = user.generateJWT();

    return res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}`,
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/auth/avatar/:id
export const setAvatarController = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const imageData = req.body.image;

    const user = await User.findByIdAndUpdate(
      userId,
      { isAvatarImageSet: true, avatarImage: imageData },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      isSet: user.isAvatarImageSet,
      image: user.avatarImage,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/users/:id/all (returns all other users)
export const allUsers = async (req, res, next) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.id } }).select([
      "email",
      "name",         // <- use 'name', not 'username'
      "avatarImage",
      "_id",
    ]);

    return res.status(200).json({ success: true, users });
  } catch (err) {
    next(err);
  }
};
