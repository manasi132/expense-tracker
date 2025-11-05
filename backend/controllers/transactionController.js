// backend/controllers/transactionController.js
import Transaction from "../models/TransactionModel.js";
import User from "../models/UserSchema.js"; // if you reference User here
                // <-- check filename exactly

// Create
export const addTransactionController = async (req, res, next) => {
  try {
    const {
      title,
      amount,
      description,
      date,
      category,
      transactionType,
      userId: userIdFromBody,
    } = req.body;

    if (!title || amount == null || !description || !date || !category || !transactionType) {
      return res.status(400).json({ success: false, message: "Please fill all fields" });
    }
    if (transactionType !== "income" && transactionType !== "expense") {
      return res.status(400).json({ success: false, message: "Invalid transaction type" });
    }

    // Avoid optional chaining (older Node versions can choke)
    const userId = (req.user && req.user.id) || userIdFromBody || null;

    let userDoc = null;
    if (userId) {
      userDoc = await User.findById(userId);
      if (!userDoc) return res.status(404).json({ success: false, message: "User not found" });
    }

    const tx = await Transaction.create({
      title: String(title).trim(),
      amount: Number(amount),
      description: String(description).trim(),
      date: new Date(date),
      category: String(category).trim(),
      transactionType,
      user: userId || undefined,
    });

    // Only if you actually keep a transactions array on User (optional)
    if (userDoc && Array.isArray(userDoc.transactions)) {
      userDoc.transactions.push(tx._id || tx.id);
      await userDoc.save();
    }

    return res.status(201).json({
      success: true,
      message: "Transaction added successfully",
      transaction: tx,
    });
  } catch (err) {
    next(err);
  }
};

// Read (with filters)
export const getAllTransactionController = async (req, res, next) => {
  try {
    const source = req.method === "GET" ? req.query : req.body;
    const { userId: userIdRaw, type = "all", frequency = "custom", startDate, endDate } = source;

    const userId = (req.user && req.user.id) || userIdRaw || null;

    const query = {};
    if (userId) query.user = userId;
    if (type !== "all") query.transactionType = type;

    // frequency: number of days OR custom range
    if (frequency !== "custom") {
      const days = Number(frequency);
      if (!Number.isNaN(days) && days > 0) {
        const after = new Date();
        after.setDate(after.getDate() - days);
        query.date = { $gt: after };
      }
    } else if (startDate && endDate) {
      const gte = new Date(startDate);
      const lte = new Date(endDate);
      if (!isNaN(gte) && !isNaN(lte)) query.date = { $gte: gte, $lte: lte };
    }

    const transactions = await Transaction.find(query).sort({ date: -1 });

    return res.status(200).json({ success: true, transactions });
  } catch (err) {
    next(err);
  }
};

// Delete
export const deleteTransactionController = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const userId = (req.user && req.user.id) || (req.body && req.body.userId) || null;

    const tx = await Transaction.findByIdAndDelete(transactionId);
    if (!tx) return res.status(404).json({ success: false, message: "Transaction not found" });

    if (userId) {
      const user = await User.findById(userId);
      if (user && Array.isArray(user.transactions)) {
        user.transactions = user.transactions.filter((t) => String(t) !== String(transactionId));
        await user.save();
      }
    }

    return res.status(200).json({ success: true, message: "Transaction deleted", transactionId });
  } catch (err) {
    next(err);
  }
};

// Update
export const updateTransactionController = async (req, res, next) => {
  try {
    const transactionId = req.params.id;
    const allowed = ["title", "amount", "description", "date", "category", "transactionType"];
    const updates = {};

    for (const key of allowed) {
      if (req.body[key] != null) {
        if (key === "amount") updates.amount = Number(req.body.amount);
        else if (key === "date") updates.date = new Date(req.body.date);
        else updates[key] =
          typeof req.body[key] === "string" ? req.body[key].trim() : req.body[key];
      }
    }

    if (updates.transactionType && !["income", "expense"].includes(updates.transactionType)) {
      return res.status(400).json({ success: false, message: "Invalid transaction type" });
    }

    const tx = await Transaction.findByIdAndUpdate(
      transactionId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!tx) return res.status(404).json({ success: false, message: "Transaction not found" });

    return res.status(200).json({
      success: true,
      message: "Transaction updated successfully",
      transaction: tx,
    });
  } catch (err) {
    next(err);
  }
};
