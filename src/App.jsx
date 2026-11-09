import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import CustomerLayout from './customer/CustomerLayout.jsx';
import Home from './customer/Home.jsx';
import Cars from './customer/Cars.jsx';
import Book from './customer/Book.jsx';
import Confirmation from './customer/Confirmation.jsx';
import Track from './customer/Track.jsx';
import AdminLayout from './admin/AdminLayout.jsx';
import AdminLogin from './admin/AdminLogin.jsx';
import Dashboard from './admin/Dashboard.jsx';
import Enquiries from './admin/Enquiries.jsx';
import EnquiryDetail from './admin/EnquiryDetail.jsx';
import VehicleManager from './admin/VehicleManager.jsx';
import Roadmap from './admin/Roadmap.jsx';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<CustomerLayout />}>
          <Route index element={<Home />} />
          <Route path="cars" element={<Cars />} />
          <Route path="book" element={<Book />} />
          <Route path="enquiry/:id" element={<Confirmation />} />
          <Route path="track" element={<Track />} />
        </Route>
        <Route path="admin/login" element={<AdminLogin />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="enquiries" element={<Enquiries />} />
          <Route path="enquiries/:id" element={<EnquiryDetail />} />
          <Route path="vehicles" element={<VehicleManager />} />
          <Route path="roadmap" element={<Roadmap />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
