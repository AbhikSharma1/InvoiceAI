import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { clerkMiddleware } from '@clerk/express'
import { connect } from 'mongoose';
import { connectDB } from './config/db.js';
import path from 'path';
import invoiceRouter from './routes/invoiceRouter.js';
import businessProfileRouter from './routes/businessProfileRouter.js';
import aiInvoiceRouter from './routes/aiinvoiceRouter.js';

const app = express();
const port = 4000;

// Middleware
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
app.use(clerkMiddleware())
app.use(express.json({ limit: '20mb' })); 
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
 
//Db
connectDB();

// Routes
app.use('/uploads', express.static(path.join(process.cwd(), "uploads")));

app.use('/api/invoice', invoiceRouter);
app.use('/api/businessProfile', businessProfileRouter);
app.use('/api/ai', aiInvoiceRouter);

app.get('/', (req, res) => {
    res.send("API is working..");
})

app.listen(port, () => {
    console.log(`Server started on http://localhost:${port}`);
});

