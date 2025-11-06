import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => (
  <div className="page">
    <h2>404 - Page not found</h2>
    <p>The page you are looking for does not exist.</p>
    <Link to="/dashboard">Return to dashboard</Link>
  </div>
);

export default NotFoundPage;
