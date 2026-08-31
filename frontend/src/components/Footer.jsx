import React from "react";
import "../styles/Footer.css";

function Footer(){
    const year = new Date().getFullYear();
    return (
        <footer className="site-footer">
            <div className="footer-container">
                <div className="footer-brand">
                    <h3>SupportIQ</h3>
                    <p>Building clean & modern web experiences.</p>
                </div>
 
            </div>

            <div className="footer-bottom">
                <p>© {year} SupportIQ. All rights reserved.</p>
            </div>
        </footer>
    );
}


export default Footer;