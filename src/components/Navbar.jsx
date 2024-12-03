import React from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <h2>conversoDB</h2>
      </div>
      <ul className="navbar-links">
        <li>
          <Link to="/" className="nav-link">Home</Link>
        </li>
        <li>
          <Link to="/chatbot" className="nav-link">Chatbot</Link>
        </li>
        <li>
          <Link to="/profile" className="nav-link">Profile</Link>
        </li>
        <li>
          <Link to="/settings" className="nav-link">Settings</Link>
        </li>
        <li>
          <Link to="/logout" className="nav-link">Logout</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
