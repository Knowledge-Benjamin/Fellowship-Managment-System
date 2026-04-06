import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getManagementClient } from '../lib/managementClient';
import { getClientForUrl } from '../lib/prismaConnectionManager';

const router = Router();

// ────────────────────────────────────────────────────────────────────────────
// System Admin Auth Guard
// All /api/system routes require a valid SystemAdmin JWT
// (NOT a campus-level JWT — these are different and stored separately)
// ────────────────────────────────────────────────────────────────────────────

function systemAdminGuard(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const secret = process.env.SYSTEM_ADMIN_JWT_SECRET || process.env.JWT_SECRET!;
        const decoded = jwt.verify(token, secret) as { id: string; role: string };
        if (decoded.role !== 'SYSTEM_ADMIN') {
            res.status(403).json({ error: 'Forbidden. System Admin access only.' });
            return;
        }
        (req as any).systemAdminId = decoded.id;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}

// ────────────────────────────────────────────────────────────────────────────
// POST /api/system/auth/login
// System Admin login — returns a SystemAdmin JWT
// ────────────────────────────────────────────────────────────────────────────

router.post('/auth/login', async (req: Request, res: Response) => {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) {
        res.status(400).json({ error: 'Email and password required' });
        return;
    }

    const mgmt = getManagementClient();
    const admin = await (mgmt as any).systemAdmin.findUnique({ where: { email } });
    if (!admin) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
    }

    const secret = process.env.SYSTEM_ADMIN_JWT_SECRET || process.env.JWT_SECRET!;
    const token = jwt.sign({ id: admin.id, role: 'SYSTEM_ADMIN' }, secret, { expiresIn: '8h' });

    await (mgmt as any).systemAdmin.update({
        where: { id: admin.id },
        data: { lastLoginAt: new Date() },
    });

    res.json({ token, adminName: admin.fullName });
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/system/campuses
// List all registered campuses
// ────────────────────────────────────────────────────────────────────────────

router.get('/campuses', systemAdminGuard, async (_req: Request, res: Response) => {
    const mgmt = getManagementClient();
    const campuses = await (mgmt as any).campus.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            subdomain: true,
            isActive: true,
            createdAt: true,
            // Don't expose the raw databaseUrl to the client
            config: true,
        },
    });
    res.json(campuses);
});

// ────────────────────────────────────────────────────────────────────────────
// POST /api/system/campuses
// Register a new campus + provision its Neon database via env var reference
// ────────────────────────────────────────────────────────────────────────────

router.post('/campuses', systemAdminGuard, async (req: Request, res: Response) => {
    const { name, subdomain, databaseUrl, config } = req.body as {
        name: string;
        subdomain: string;
        databaseUrl: string;
        config?: Record<string, unknown>;
    };

    if (!name || !subdomain || !databaseUrl) {
        res.status(400).json({ error: 'name, subdomain, and databaseUrl are required.' });
        return;
    }

    // Validate the provided DB URL by attempting a quick connection
    try {
        const testClient = getClientForUrl(databaseUrl);
        await testClient.$queryRaw`SELECT 1`;
    } catch (err) {
        res.status(400).json({
            error: 'Cannot connect to the provided databaseUrl. Please verify the Neon connection string.',
        });
        return;
    }

    const mgmt = getManagementClient();

    // Check for subdomain clash
    const existing = await (mgmt as any).campus.findUnique({ where: { subdomain } });
    if (existing) {
        res.status(409).json({ error: `Subdomain "${subdomain}" is already registered.` });
        return;
    }

    const defaultTerminology = {
        terminology: {
            Region: 'Region',
            FamilyGroup: 'Family',
            MinistryTeam: 'Ministry Team',
            FellowshipManager: 'Fellowship Manager',
        },
    };

    const campus = await (mgmt as any).campus.create({
        data: {
            name,
            subdomain,
            databaseUrl,
            config: config || defaultTerminology,
        },
    });

    console.log(`[SystemAdmin] Campus provisioned: ${subdomain} (${name})`);
    res.status(201).json({ id: campus.id, subdomain: campus.subdomain, name: campus.name });
});

// ────────────────────────────────────────────────────────────────────────────
// PATCH /api/system/campuses/:id
// Update campus metadata or terminology config
// ────────────────────────────────────────────────────────────────────────────

router.patch('/campuses/:id', systemAdminGuard, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, isActive, config } = req.body as {
        name?: string;
        isActive?: boolean;
        config?: Record<string, unknown>;
    };

    const mgmt = getManagementClient();
    const campus = await (mgmt as any).campus.update({
        where: { id },
        data: {
            ...(name !== undefined && { name }),
            ...(isActive !== undefined && { isActive }),
            ...(config !== undefined && { config }),
        },
    });

    res.json(campus);
});

// ────────────────────────────────────────────────────────────────────────────
// GET /api/system/config/tenant
// PUBLIC endpoint — returns the terminology config for the requesting campus.
// Called by the frontend on startup to fetch campus-specific label mappings.
// Uses X-Campus-Domain header (same as the tenant middleware).
// ────────────────────────────────────────────────────────────────────────────

router.get('/config/tenant', async (req: Request, res: Response) => {
    const subdomain = req.headers['x-campus-domain'] as string | undefined;

    if (!subdomain) {
        // Return Makerere defaults for local dev / subdomain-less access
        res.json({
            terminology: {
                Region: 'Region',
                FamilyGroup: 'Family',
                MinistryTeam: 'Ministry Team',
                FellowshipManager: 'Fellowship Manager',
            },
        });
        return;
    }

    try {
        const mgmt = getManagementClient();
        const campus = await (mgmt as any).campus.findUnique({
            where: { subdomain },
            select: { config: true, isActive: true },
        });

        if (!campus || !campus.isActive) {
            res.status(404).json({ error: 'Campus not found or inactive.' });
            return;
        }

        res.json(campus.config);
    } catch {
        // Management DB may not be configured in local dev — return safe defaults
        res.json({
            terminology: {
                Region: 'Region',
                FamilyGroup: 'Family',
                MinistryTeam: 'Ministry Team',
                FellowshipManager: 'Fellowship Manager',
            },
        });
    }
});

export default router;
