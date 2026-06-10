import express from "express";
import pool from "../config/database";
import {verifyToken} from "../middleware/auth";

const router = express.Router();


