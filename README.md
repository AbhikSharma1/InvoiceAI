# InvoiceAI

A full-stack web application that lets you create professional invoices in seconds using AI. Just describe what you want in plain text and the AI fills in all the invoice details for you automatically.

---

## What It Does

- **AI Invoice Generation** — Type something like *"Invoice for Acme Corp, web design ₹15,000, consultation 2 hours ₹3,000, due in 30 days"* and the AI fills the entire invoice form instantly
- **Manual Invoice Creation** — Fill in the form yourself with full control over every field
- **Invoice Management** — View, search, filter, and delete all your invoices from one place
- **Business Profile** — Save your business details, logo, stamp, and signature so they appear on every invoice
- **Authentication** — Secure login and signup powered by Clerk
- **Dashboard** — See your invoice stats at a glance — total invoices, paid, unpaid, and outstanding amounts

---

## Tech Stack

**Frontend**
- React (Vite)
- Tailwind CSS
- Clerk (authentication)
- React Router

**Backend**
- Node.js + Express
- MongoDB (local or Atlas)
- Clerk Express middleware
- Google Gemini AI (REST API)
- Multer (file uploads)

---

## Project Structure

```
InvoiceAI/
├── backend/
│   ├── config/         # MongoDB connection
│   ├── controllers/    # Business logic for invoices and profiles
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API routes including AI route
│   ├── uploads/        # Uploaded images (logo, stamp, signature)
│   └── server.js       # Entry point
└── frontend/
    └── src/
        ├── components/ # Navbar, AppShell, Hero, Features, etc.
        ├── pages/      # Dashboard, Invoices, CreateInvoice, BusinessProfile
        └── assets/     # Styles and static files
```

---

## Getting Started

### Requirements

- Node.js v18+
- MongoDB running locally (or a MongoDB Atlas URI)
- A Clerk account (free) — [clerk.com](https://clerk.com)
- A Google Gemini API key — [aistudio.google.com](https://aistudio.google.com)

---

### 1. Clone the repo

```bash
git clone https://github.com/AbhikSharma1/InvoiceAI.git
cd InvoiceAI
```

### 2. Set up the backend

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:

```env
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
GEMINI_API_KEY=your_gemini_api_key
MONGODB_URI=mongodb://localhost:27017/InvoiceAI
```

Start the backend:

```bash
npm start
```

The backend runs on `http://localhost:4000`

---

### 3. Set up the frontend

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend/` folder:

```env
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

Start the frontend:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173`

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/generate` | Generate invoice data from plain text using Gemini AI |
| GET | `/api/invoice` | Get all invoices for the logged-in user |
| POST | `/api/invoice` | Create a new invoice |
| PUT | `/api/invoice/:id` | Update an invoice |
| DELETE | `/api/invoice/:id` | Delete an invoice |
| GET | `/api/businessProfile/me` | Get the logged-in user's business profile |
| POST | `/api/businessProfile` | Create a business profile |
| PUT | `/api/businessProfile/:id` | Update a business profile |

---

## How the AI Works

1. You type a description of your invoice in plain English
2. The app sends it to the Gemini AI via the Google REST API
3. Gemini extracts all the details — client name, items, prices, dates, tax — and returns them as structured JSON
4. The form gets filled automatically
5. You can review and edit anything before saving

---

## Environment Variables Reference

| Variable | Where | Description |
|----------|-------|-------------|
| `CLERK_PUBLISHABLE_KEY` | backend `.env` | Clerk public key |
| `CLERK_SECRET_KEY` | backend `.env` | Clerk secret key |
| `GEMINI_API_KEY` | backend `.env` | Google Gemini API key |
| `MONGODB_URI` | backend `.env` | MongoDB connection string |
| `VITE_CLERK_PUBLISHABLE_KEY` | frontend `.env` | Clerk public key for frontend |

---

## Screenshots

> Dashboard, invoice list, AI generation, and business profile pages are all included in the app.

---

## License

MIT — free to use and modify.

---

Developed by [Abhik Sharma](https://abhik.kshitizproducts.cloud)
