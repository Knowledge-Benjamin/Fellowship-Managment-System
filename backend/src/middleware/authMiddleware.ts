import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DecodedToken {
    id: string;
    role: string;
    iat: number;
    exp: number;
}

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                role: string;
            };
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];

            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

            const user = await prisma.member.findUnique({
                where: { id: decoded.id },
                select: { id: true, role: true, isDeleted: true, requiresReauth: true },
            });

            if (!user || user.isDeleted) {
                res.status(401).json({ message: 'Not authorized, user not found' });
                return;
            }

            // Session invalidated due to privilege elevation — force re-login + MFA
            if (user.requiresReauth) {
                res.status(401).json({
                    code: 'SESSION_ELEVATED_PRIVILEGES',
                    message: 'Your account permissions have changed. Please sign in again to continue.',
                });
                return;
            }

            req.user = { id: user.id, role: user.role };
            next();
            return;
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized, token failed' });
            return;
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
        return;
    }
};

export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({
                message: `User role ${req.user?.role} is not authorized to access this route`,
            });
            return;
        }
        next();
    };
};
