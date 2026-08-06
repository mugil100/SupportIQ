const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");
const { verifyToken } = require("../middleware/auth");
const {Resend}  =require("resend");
const router = express.Router();
const  {SendEmail} = require("../services/emailService"); 

const { body } = require("express-validator");
const { validate } = require("../middleware/validate");
const { authLimiter } = require("../middleware/rateLimiter");

// User registration
router.post("/signup",
    authLimiter,
    [
        body("name").trim().notEmpty().withMessage("Name is required").isLength({ max: 100 }).withMessage("Name must be under 100 characters"),
        body("username").trim().notEmpty().withMessage("Username is required").isLength({ min: 3, max: 30 }).withMessage("Username must be between 3 and 30 characters").isAlphanumeric().withMessage("Username must be alphanumeric"),
        body("email").isEmail().withMessage("Must be a valid email").normalizeEmail(),
        body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
        body("role").optional().isIn(["customer", "agent", "manager"]).withMessage("Invalid role")
    ],
    validate,
    async (req, res) => {
    const { name, username, email, password, role } = req.body;

    try {
        const userNameexists = await pool.query(
            "select * from users where username = $1",
            [username]
        );
        if (userNameexists.rows.length > 0) {
            return res.status(400).json({ error: "Username already registered !" });
        }

        const userEmailexists = await pool.query(
            "select * from users where email = $1",
            [email]
        );
        if (userEmailexists.rows.length > 0) {
            return res.status(400).json({ error: "Email already registered !" });
        }

        const hashPwd = await bcrypt.hash(password, 10);

        const insertRes = await pool.query(
            "insert into users (username,email,password,role,name) values ($1,$2,$3,$4,$5) RETURNING id, username, name,role",
            [username, email, hashPwd, "customer", name]
        );

        const newUser = insertRes.rows[0];
        // issue token for the newly registered user
        const token = jwt.sign(
            { customer_id: newUser.id, role: newUser.role },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        res.status(201).json({
            message: "User registered successfully !!!",
            name: newUser.name,
            username: newUser.username,
            role: newUser.role,
            id: newUser.id,
            token
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// User login
router.post("/login",
    authLimiter,
    [
        body("email").optional().isEmail().withMessage("Must be a valid email").normalizeEmail(),
        body("username").optional().trim(),
        body("password").notEmpty().withMessage("Password is required"),
        body("role").isIn(["customer", "agent", "manager"]).withMessage("Invalid role"),
        body().custom(value => {
            if (!value.email && !value.username) {
                throw new Error("Either email or username is required");
            }
            return true;
        })
    ],
    validate,
    async (req, res) => {
    const { email, username, password, role } = req.body;
    const identifier = email || username;

    try {
        const userData = await pool.query(
            "select * from users where (email = $1 or username = $1) and role= $2",
            [identifier, role]
        );

        if (userData.rows.length === 0) {
            return res.status(400).json({ error: "User not found" });
        }

        // compare password
        const checkingVal = userData.rows[0].password;

        const pwdmatch = await bcrypt.compare(password, checkingVal);
        if (!pwdmatch) {
            return res.status(400).json({ error: "Wrong Password" });
        }

        // update last seen
        await pool.query(
            "update users set last_seen = NOW() where id =$1",
            [userData.rows[0].id]
        );

        const token = jwt.sign(
            {
                customer_id: userData.rows[0].id,
                role: userData.rows[0].role
            },
            process.env.JWT_SECRET,
            { expiresIn: "1h" }
        );

        return res.json({
            message: "Login Successful",
            token,
            username: userData.rows[0].username,
            name: userData.rows[0].name,
            role: userData.rows[0].role,
            id: userData.rows[0].id
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

router.post("/forgot-pwd",
    [
        body("email").isEmail().withMessage("Must be a valid email").normalizeEmail()
    ],
    validate,
    async (req, res) => {
    try{
        const { email } = req.body;
        console.log(email);
        const user = await pool.query(
            `
            select id, role from users
            where 
            email = $1`, [email]
        );
        if(user.rows.length ===0){
            return res.status(404).json({error:"Error : Email not found"});
        }
        const reset = jwt.sign(
            {
                userid: user.rows[0].id,
                role: user.rows[0].role

            },
            process.env.JWT_SECRET,
            {
                expiresIn: "15m" 
            }
        );
        const reset_link = `${process.env.FRONTEND_URL}/reset-pwd/${reset}`;

        //email sending logic

        await SendEmail(email, reset_link);

        res.json({
            message: "Reset link generated successfully."
        });

    }catch(error){
        console.error(error);
        res.status(400).json({
            error: "Error : Invalid Email"
        });
        return;
    }
});

router.post("/reset-pwd",
    [
        body("password").isLength({ min: 8 }).withMessage("Password must be at least 8 characters"),
        body("token").notEmpty().withMessage("Token is required")
    ],
    validate,
    async(req,res)=>{

    try{
        const {password, token}  = req.body;
        const hashed = await bcrypt.hash(password,10);
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );
        
        const id = decoded['userid'];

        await pool.query(`
            update users set password = $1 where id = $2
            `,[hashed, id]);
        res.status(200).json({
            message : "Password reset successful ,Login to continue..."
        });
        return;

    }catch(error){
        res.status(404).json({
            error:"Error :Invalid token"
        });
        return;

    }

});

module.exports = router;
