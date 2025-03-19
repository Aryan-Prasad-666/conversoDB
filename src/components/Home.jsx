import React from "react";
import { Link } from "react-router-dom";
import Spline from '@splinetool/react-spline';
import Navbar from "./Navbar";
import "./Home.css";

const Home = () => {
  return (
    <div className="home">
      <Navbar /> 
      
      <header className="home-header">
        <h1>Welcome to the conversoDB!</h1>
        <p>Your one-stop solution for managing bills and items.</p>
      </header>
      
      <div className="spline-background">
        {/* <Spline scene="https://prod.spline.design/WQOhTY9TlxPJEq6X/scene.splinecode" /> */}
        {/* <Spline scene="https://prod.spline.design/xz5okzxw3erJedlW/scene.splinecode" />  */}
        {/* <Spline scene="https://prod.spline.design/Dpz2rOssjllsgyvh/scene.splinecode" /> */}
        {/* <Spline scene="https://prod.spline.design/9zQFgSv8q1Evf0WS/scene.splinecode" /> */}
        <Spline scene="https://prod.spline.design/oR8PwXXParsI1BxN/scene.splinecode" />
      </div>
      
      <footer className="footer">
        <p>&copy; 2024 conversoDB</p>
      </footer>
    </div>
  );
};

export default Home;

      
      
      

