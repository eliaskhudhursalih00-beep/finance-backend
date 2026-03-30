import { Request, Response } from "express";
import { RegisterRequest, LoginRequest } from "../types";

const pool = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");

// Define a minimal user shape returned from DB
interface DbUser {
    id: number;
    email: string;
    password: string;
}

const register = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as RegisterRequest;

    try {
        const hashedPassword = await bcrypt.hash(password, 12);

        const result = await pool.query(
            "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
            [email, hashedPassword]
        );

        const user: DbUser = result.rows[0];
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
            [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        );

        res.status(201).json({
            message: "User registered successfully",
            user,
            accessToken,
            refreshToken,
        });
    } catch (error: any) {
        console.error(error);
        if (error.code === "23505") {
            res.status(409).json({ error: "Email is already registered" });
            return;
        }
        res.status(500).json({ error: "Internal server error" });
    }
};

const login = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body as LoginRequest;

    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );

        if (result.rows.length === 0) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const user: DbUser = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            res.status(401).json({ error: "Invalid email or password" });
            return;
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await pool.query(
            "DELETE FROM refresh_tokens WHERE user_id = $1",
            [user.id]
        );

        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
            [user.id, refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        );

        res.status(200).json({
            message: "Login successful",
            accessToken,
            refreshToken,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

const refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        res.status(401).json({ error: "Refresh token required" });
        return;
    }

    try {
        const payload = jwt.verify(
            refreshToken,
            process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
        ) as { id: number; email: string };

        const result = await pool.query(
            "SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2",
            [refreshToken, payload.id]
        );

        if (result.rows.length === 0) {
            res.status(403).json({ error: "Invalid refresh token" });
            return;
        }

        const dbToken = result.rows[0];
        if (new Date(dbToken.expires_at) < new Date()) {
            await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
            res.status(403).json({ error: "Refresh token expired" });
            return;
        }

        const newRefreshToken = generateRefreshToken({ id: payload.id, email: payload.email });
        const newAccessToken = generateAccessToken({ id: payload.id, email: payload.email });

        await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
        await pool.query(
            "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
            [payload.id, newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]
        );

        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        });
    } catch (error) {
        console.error(error);
        res.status(403).json({ error: "Invalid or expired refresh token" });
    }
};

const logout = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        res.status(400).json({ error: "Refresh token required" });
        return;
    }

    try {
        await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken]);
        res.status(200).json({ message: "Logged out successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
};

module.exports = { register, login, refresh, logout };