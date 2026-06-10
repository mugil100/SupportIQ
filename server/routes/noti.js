const express = require("express");
const { verifyToken } = require("../middleware/auth");
const { getNoti, mark_noti_read, filterNoti, mark_all_as_read } = require("../services/NotiService");

const router = express.Router();

// Fetch notifications for the agent
router.get("/noti", verifyToken, async (req, res) => {
    try {
        await getNoti(req, res);
        console.log("Notifications fetched successfully");
    } catch (error) {
        res.status(404).json(error);
    }
});

// Filter notifications by read/unread state
router.post("/noti/filter", verifyToken, async (req, res) => {
    try {
        await filterNoti(req, res);
        console.log("Notification filtered successfully");
    } catch (error) {
        res.status(404).json(error);
    }
});

// Mark all notifications as read
router.post("/noti/mark-all", verifyToken, async (req, res) => {
    try {
        await mark_all_as_read(req, res);
        console.log("All notifications marked as read");
    } catch (error) {
        res.status(404).json(error);
    }
});

// Mark specific notification as read (must be last due to parameter matching)
router.post("/noti/:id", verifyToken, async (req, res) => {
    try {
        await mark_noti_read(req, res);
        console.log("Notification marked");
    } catch (error) {
        res.status(404).json(error);
    }
});

module.exports = router;
