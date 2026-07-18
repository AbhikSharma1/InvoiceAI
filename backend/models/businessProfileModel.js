import mongoose from "mongoose";
import validator from "validator";
const businessProfileSchema = new mongoose.Schema({
    owner : { type : String, required: true, unique: true},

    businessName : { type : String, required: true },
    email : { type : String, required : false, trim : true, lowwercase : true, default : "" },
    address : { type : String, required : false, default : "" },
    phone : { type : String, required : false, default : "" },
    gst : { type : String, required : false, default : "" },

    // for images 

    logourl : { type : String, required : false, default : "" },
    stampurl : { type : String, required : false, default : "" },
    signatureurl : { type : String, required : false, default : "" },

    signatureOwnerName : { type : String, required : false, default : "" },
    signatureOwnerTitle : { type : String, required : false, default : "" },

    defaultTaxPercent : { type : Number, required : false, default : 18},

}, {
    timestamps : true
});

const BusinessProfile = mongoose.models.BusinessProfile || mongoose.model('BusinessProfile', businessProfileSchema);

export default BusinessProfile;