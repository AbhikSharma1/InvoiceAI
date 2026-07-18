import { getAuth } from "@clerk/express";
import BusinessProfile from "../models/businessProfileModel.js";

const API_BASE = "http://localhost:4000";

// Helper: file to url
function uploadedFilesToUrls(req) {
    const urls = {};
    if (!req.files) return urls;

    const logoArr = req.files.logoName || [];
    const stampArr = req.files.stampName || [];
    const sigArr = req.files.signatureNameMeta || [];

    // Match these keys exactly to your Model fields: logourl, stampurl, signatureurl
    if (logoArr[0]) urls.logourl = `${API_BASE}/uploads/${logoArr[0].filename}`;
    if (stampArr[0]) urls.stampurl = `${API_BASE}/uploads/${stampArr[0].filename}`;
    if (sigArr[0]) urls.signatureurl = `${API_BASE}/uploads/${sigArr[0].filename}`;

    return urls;
}

// Create profile
export async function createBusinessProfile(req, res) {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const body = req.body || {};
        const fileUrls = uploadedFilesToUrls(req);

        const profile = new BusinessProfile({
            owner: userId,
            businessName: body.businessName || "New Business",
            email: body.email || "",
            address: body.address || "",
            phone: body.phone || "",
            gst: body.gst || "",
            // Use the lowercase keys from the model
            logourl: fileUrls.logourl || body.logourl || "",
            stampurl: fileUrls.stampurl || body.stampurl || "",
            signatureurl: fileUrls.signatureurl || body.signatureurl || "",
            signatureOwnerName: body.signatureOwnerName || "",
            signatureOwnerTitle: body.signatureOwnerTitle || "",
            defaultTaxPercent: body.defaultTaxPercent !== undefined ? Number(body.defaultTaxPercent) : 18,
        });

        const saved = await profile.save();
        return res.status(201).json({ success: true, data: saved });
    } catch (err) {
        console.error("Create Error:", err);
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// Update profile
export async function updateBusinessProfile(req, res) {
    try {
        const { userId } = getAuth(req);
        const { id } = req.params;
        const body = req.body || {};
        const fileUrls = uploadedFilesToUrls(req);

        const existing = await BusinessProfile.findById(id);
        if (!existing) return res.status(404).json({ success: false, message: "Not found" });
        if (existing.owner !== userId) return res.status(403).json({ success: false, message: "Forbidden" });

        const update = { ...body };
        
        // Merge file URLs if new files were uploaded
        if (fileUrls.logourl) update.logourl = fileUrls.logourl;
        if (fileUrls.stampurl) update.stampurl = fileUrls.stampurl;
        if (fileUrls.signatureurl) update.signatureurl = fileUrls.signatureurl;

        const updated = await BusinessProfile.findByIdAndUpdate(id, update, { new: true, runValidators: true });
        return res.status(200).json({ success: true, data: updated });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// FIX: Renamed from getBusinessProfile to getMyBusinessProfile to match your Router
export async function getMyBusinessProfile(req, res) {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

        const profile = await BusinessProfile.findOne({ owner: userId }).lean();
        if (!profile) return res.status(404).json({ success: false, message: "Profile not found" });

        return res.status(200).json({ success: true, data: profile });
    } catch (err) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
}