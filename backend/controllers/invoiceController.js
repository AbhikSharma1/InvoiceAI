import mongoose from "mongoose";
import Invoice from "../models/invoiceModel.js";
import { getAuth } from "@clerk/express";
import path from "path";

const API_BASE = "http://localhost:4000";

/* ===================== HELPERS ===================== */

// Compute subtotal, tax & total
const computeTotals = (items = [], taxPercent = 0) => {
    const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

    const subtotal = safeItems.reduce(
        (sum, item) =>
            sum + Number(item.qty || 0) * Number(item.unitPrice || 0),
        0
    );

    const tax = (subtotal * Number(taxPercent || 0)) / 100;
    const total = subtotal + tax;

    return { subtotal, tax, total };
};

// Parse items when coming as string/formData
const parseItemsField = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val;

    if (typeof val === "string") {
        try {
            return JSON.parse(val);
        } catch {
            return [];
        }
    }
    return [];
};

// Check if string is Mongo ObjectId
const isObjectIdString = (val) =>
    typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val);

// Convert uploaded files to public URLs
const uploadedFilesToUrls = (req) => {
    const urls = {};
    if (!req.files) return urls;

    const mapping = {
        logo: "logoDataUrl",
        stamp: "stampDataUrl",
        signature: "signatureDataUrl",
    };

    Object.keys(mapping).forEach((field) => {
        const fileArr = req.files[field];
        if (Array.isArray(fileArr) && fileArr[0]) {
            const filename =
                fileArr[0].filename ||
                (fileArr[0].path && path.basename(fileArr[0].path));
            if (filename) {
                urls[mapping[field]] = `${API_BASE}/uploads/${filename}`;
            }
        }
    });

    return urls;
};

// Generate unique invoice number
const generateUniqueInvoiceNumber = async (attempts = 8) => {
    for (let i = 0; i < attempts; i++) {
        const ts = Date.now().toString();
        const suffix = Math.floor(Math.random() * 900000)
            .toString()
            .padStart(6, "0");

        const candidate = `INV-${ts.slice(-6)}-${suffix}`;
        const exists = await Invoice.exists({ invoiceNumber: candidate });
        if (!exists) return candidate;

        await new Promise((r) => setTimeout(r, 2));
    }
    return new mongoose.Types.ObjectId().toString();
};

/* ===================== CREATE ===================== */

export async function createInvoice(req, res) {
    try {
        const { userId } = getAuth(req) || {};
        if (!userId)
            return res.status(401).json({ success: false, message: "Auth required" });

        const body = req.body || {};
        const items = Array.isArray(body.items)
            ? body.items
            : parseItemsField(body.items);

        const taxPercent = Number(body.taxPercent ?? body.tax ?? 0);
        const totals = computeTotals(items, taxPercent);
        const fileUrls = uploadedFilesToUrls(req);

        const invoiceNumber =
            body.invoiceNumber?.trim() ||
            (await generateUniqueInvoiceNumber());

        const exists = await Invoice.exists({ invoiceNumber });
        if (exists)
            return res
                .status(409)
                .json({ success: false, message: "Invoice number already exists" });

        const invoice = await Invoice.create({
            owner: userId,
            invoiceNumber,
            issueDate: body.issueDate || new Date(),
            dueDate: body.dueDate,
            fromBusinessName: body.fromBusinessName,
            fromEmail: body.fromEmail,
            fromAddress: body.fromAddress,
            fromPhone: body.fromPhone,
            fromGst: body.fromGst,
            client: body.client || {},
            items,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            currency: body.currency || "INR",
            status: body.status || "draft",
            taxPercent,
            ...fileUrls,
            signatureName: body.signatureName,
            signatureTitle: body.signatureTitle,
            notes: body.notes,
        });

        return res.status(201).json({ success: true, data: invoice });
    } catch (err) {
        console.error("createInvoice:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/* ===================== GET ALL ===================== */

export async function getInvoices(req, res) {
    try {
        const { userId } = getAuth(req) || {};
        if (!userId)
            return res.status(401).json({ success: false, message: "Auth required" });

        const query = { owner: userId };
        if (req.query.status) query.status = req.query.status;

        const invoices = await Invoice.find(query)
            .sort({ createdAt: -1 })
            .lean();

        return res.status(200).json({ success: true, data: invoices });
    } catch (err) {
        console.error("getInvoices:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/* ===================== GET BY ID ===================== */

export async function getInvoiceById(req, res) {
    try {
        const { userId } = getAuth(req) || {};
        if (!userId)
            return res.status(401).json({ success: false, message: "Auth required" });

        const { id } = req.params;
        const invoice = isObjectIdString(id)
            ? await Invoice.findById(id)
            : await Invoice.findOne({ invoiceNumber: id });

        if (!invoice)
            return res.status(404).json({ success: false, message: "Not found" });

        if (String(invoice.owner) !== userId)
            return res.status(403).json({ success: false, message: "Forbidden" });

        return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
        console.error("getInvoiceById:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/* ===================== UPDATE ===================== */

export async function updateInvoice(req, res) {
    try {
        const { userId } = getAuth(req) || {};
        if (!userId)
            return res.status(401).json({ success: false, message: "Auth required" });

        const { id } = req.params;
        const body = req.body || {};

        const invoice = await Invoice.findOne(
            isObjectIdString(id)
                ? { _id: id, owner: userId }
                : { invoiceNumber: id, owner: userId }
        );

        if (!invoice)
            return res.status(404).json({ success: false, message: "Not found" });

        const items = parseItemsField(body.items) || invoice.items;
        const taxPercent = Number(body.taxPercent ?? invoice.taxPercent);
        const totals = computeTotals(items, taxPercent);

        Object.assign(invoice, {
            ...body,
            items,
            subtotal: totals.subtotal,
            tax: totals.tax,
            total: totals.total,
            taxPercent,
            ...uploadedFilesToUrls(req),
        });

        await invoice.save();

        return res.status(200).json({ success: true, data: invoice });
    } catch (err) {
        console.error("updateInvoice:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

/* ===================== DELETE ===================== */

export async function deleteInvoice(req, res) {
    try {
        const { userId } = getAuth(req) || {};
        if (!userId)
            return res.status(401).json({ success: false, message: "Auth required" });

        const { id } = req.params;

        const invoice = await Invoice.findOneAndDelete(
            isObjectIdString(id)
                ? { _id: id, owner: userId }
                : { invoiceNumber: id, owner: userId }
        );

        if (!invoice)
            return res.status(404).json({ success: false, message: "Not found" });

        return res.status(200).json({
            success: true,
            message: "Invoice deleted",
        });
    } catch (err) {
        console.error("deleteInvoice:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}
