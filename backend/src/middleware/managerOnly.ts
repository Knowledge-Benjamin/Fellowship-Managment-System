import { Request, Response, NextFunction } from 'express';

interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const managerOnly = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required' });
            return;
        }

        if (req.user.role !== 'FELLOWSHIP_MANAGER') {
            res.status(403).json({
                error: 'This action is restricted to Fellowship Managers only'
            });
            return;
        }

        next();
    } catch (error) {
        console.error('Error in manager-only middleware:', error);
        res.status(500).json({ error: 'Authorization check failed' });
    }
};
