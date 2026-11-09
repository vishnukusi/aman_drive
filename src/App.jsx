import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense, useLayoutEffect } from 'react';
import CustomerLayout from './customer/CustomerLayout.jsx';
import Home from './customer/Home.jsx';
import Cars from './customer/Cars.jsx';
import Location from './customer/Location.jsx';
import Book from './customer/Book.jsx';
import Confirmation from './customer/Confirmation.jsx';
import Track from './customer/Track.jsx';

// The staff dashboard is never needed by customers, so it is split into its own chunk and loaded on demand.
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'));
const AdminLogin = lazy(() => import('./admin/AdminLogin.jsx'));
const Dashboard = lazy(() => import('./admin/Dashboard.jsx'));
const Enquiries = lazy(() => import('./admin/Enquiries.jsx'));
const EnquiryDetail = lazy(() => import('./admin/EnquiryDetail.jsx'));
const VehicleManager = lazy(() => import('./admin/VehicleManager.jsx'));
const Roadmap = lazy(() => import('./admin/Roadmap.jsx'));

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useLayoutEffect(() => {
    // Home-page section links (?s=…) do their own scrolling.
    if (pathname === '/' && new URLSearchParams(search).get('s')) return;
    window.scrollTo(0, 0);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const Loading = () => <div className="container section muted" role="status">Loading…</div>;

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<CustomerLayout />}>
            <Route index element={<Home />} />
            <Route path="cars" element={<Cars />} />
            <Route path="locations/:city" element={<Location />} />
            <Route path="book" element={<Book />} />
            <Route path="enquiry/:id" element={<Confirmation />} />
            <Route path="track" element={<Track />} />
            <Route path="track/:ref" element={<Track />} />
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
      </Suspense>
    </>
  );
}
