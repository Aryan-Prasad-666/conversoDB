import React, { useState } from "react";
import "./Profile.css";
import Navbar from "./Navbar";

const Profile = () => {
  const [profile, setProfile] = useState({
    name: "Aryan Prasad",
    Sname: "Clothes shop",
    email: "aryan@gmail.com",
    phone: "9999911111",
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    setIsEditing(false);
    alert("Profile updated successfully!");

  };

  return (
    <div className="profile-page">
      <Navbar />
      <div className="profile-wrapper">
        <div className="profile-card">
          <div className="profile-left">
            <img
              src="https://via.placeholder.com/150"
              alt="Profile"
              className="profile-picture"
            />
            {!isEditing && (
              <button onClick={toggleEditing} className="btn-edit">
                Edit Profile
              </button>
            )}
          </div>
          <div className="profile-right">
            <h2 className="profile-title">Your Profile</h2>
            <div className="profile-field">
              <label>Owner Name</label>
              <input
                type="text"
                name="name"
                value={profile.name}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="profile-field">
              <label>Shop Name</label>
              <input
                type="text"
                name="name"
                value={profile.Sname}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="profile-field">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={profile.email}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div className="profile-field">
              <label>Phone</label>
              <input
                type="tel"
                name="phone"
                value={profile.phone}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            {isEditing && (
              <button onClick={handleSave} className="btn-save">
                Save Changes
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
