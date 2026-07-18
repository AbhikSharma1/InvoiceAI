import React from 'react'
import { Route, Routes, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import { RedirectToSignIn, SignedIn, SignedOut } from '@clerk/clerk-react'
import AppShell from './components/AppShell.jsx'
import Dashboard from './pages/Dashboard.jsx'
import CreateInvoice from './pages/CreateInvoice.jsx'
import Invoices from './pages/Invoices.jsx'
import BusinessProfile from './pages/BusinessProfile.jsx'
import InvoicePreview from './pages/InvoicePreview.jsx'

const ClerkProtected = ({children}) => (
  <>
    <SignedIn>{children}</SignedIn>
    <SignedOut><RedirectToSignIn /></SignedOut>
  </> 
);

function App() {
  return (
    <div className='min-h-screen max-w-full overflow-x-hidden'> 
      <Routes>
        {/* Public Route */}
        <Route path='/' element={<Home />} />

        {/* Protected Nested Routes */}
        <Route 
          path='/app' 
          element={<ClerkProtected><AppShell /></ClerkProtected>}
        >
          {/* This handles /app/dashboard */}
          <Route path='dashboard' element={<Dashboard />} />
          <Route path='create-invoice' element={<CreateInvoice />} />
          <Route path='invoices' element={<Invoices />} />
          <Route path='invoices/:id' element={<InvoicePreview />} />
          <Route path='business' element={<BusinessProfile />} />
          
          {/* Optional: Redirect /app to /app/dashboard automatically */}
          <Route index element={<Navigate to="dashboard" replace />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App