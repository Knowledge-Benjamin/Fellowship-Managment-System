import { Request, Response } from 'express';
import prisma from '../prisma';
import { v4 as uuidv4 } from 'uuid';

export const createMember = async (req: Request, res: Response) => {
    try {
        const { fullName, phoneNumber, gender, residence, course, yearOfStudy } = req.body;
        const member = await prisma.member.create({
            data: {
                fullName,
                phoneNumber,
                gender,
                residence,
                course,
                yearOfStudy,
                qrCode: uuidv4(), // Generate unique QR code content
            },
        });
        res.status(201).json(member);
    } catch (error) {
        console.error('Error creating member:', error);
        res.status(500).json({ error: 'Failed to create member' });
    }
};

export const getMemberByQr = async (req: Request, res: Response) => {
    try {
        const { qrCode } = req.params;
        const member = await prisma.member.findUnique({
            where: { qrCode },
        });
        if (!member) {
            return res.status(404).json({ error: 'Member not found' });
        }
        res.json(member);
    } catch (error) {
        console.error('Error fetching member:', error);
        res.status(500).json({ error: 'Failed to fetch member' });
    }
};
