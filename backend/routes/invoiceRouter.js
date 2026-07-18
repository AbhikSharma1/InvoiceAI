import express from "express";
import { getInvoices , getInvoiceById, createInvoice, updateInvoice, deleteInvoice} from "../controllers/invoiceController.js";
import { clerkMiddleware } from '@clerk/express'
const invoiceRouter = express.Router();

invoiceRouter.use(clerkMiddleware());

invoiceRouter.get('/', getInvoices);
invoiceRouter.get('/:id', getInvoiceById);
invoiceRouter.post('/', createInvoice);
invoiceRouter.put('/:id', updateInvoice);
invoiceRouter.delete('/:id', deleteInvoice);

export default invoiceRouter;