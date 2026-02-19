import prisma from '../prisma';
import { Prisma } from '@prisma/client';
import {
    isMemberFinalist,
    isMemberAlumni,
} from './academicProgressionHelper';


/**
 * Check if a member qualifies as a finalist (deprecated - use isMemberFinalist from academicProgressionHelper)
 * @deprecated Use isMemberFinalist from academicProgressionHelper instead
 */
export async function isFinalist(memberId: string): Promise<boolean> {
    const member = await prisma.member.findUnique({
        where: { id: memberId },
        select: {
            registrationDate: true,
            initialYearOfStudy: true,
            initialSemester: true,
            courseRelation: {
                select: { durationYears: true },
            },
        },
    });

    if (!member) return false;

    return await isMemberFinalist({
        registrationDate: member.registrationDate,
        initialYearOfStudy: member.initialYearOfStudy,
        initialSemester: member.initialSemester,
        courseRelation: member.courseRelation,
    });
}


/**
 * Update both FINALIST and ALUMNI tag assignments for a member
 * Ensures mutual exclusion: member can only have one or neither
 */
export async function updateMemberTags(
    memberId: string,
    assignedByUserId: string,
    tx?: Prisma.TransactionClient
): Promise<void> {
    const db = tx || prisma;
    try {
        const member = await db.member.findUnique({
            where: { id: memberId },
            select: {
                registrationDate: true,
                initialYearOfStudy: true,
                initialSemester: true,
                courseRelation: {
                    select: { durationYears: true },
                },
            },
        });

        if (!member) {
            console.warn(`[TAGS] Member ${memberId} not found`);
            return;
        }

        const isNowFinalist = await isMemberFinalist(member);
        const isNowAlumni = await isMemberAlumni(member);

        // Get both system tags
        const [finalistTag, alumniTag] = await Promise.all([
            db.tag.findUnique({ where: { name: 'FINALIST' } }),
            db.tag.findUnique({ where: { name: 'ALUMNI' } }),
        ]);

        if (!finalistTag || !alumniTag) {
            console.warn('[TAGS] System tags not found in database');
            return;
        }

        // Get current assignments
        const [currentFinalistTag, currentAlumniTag] = await Promise.all([
            db.memberTag.findFirst({
                where: {
                    memberId,
                    tagId: finalistTag.id,
                    isActive: true,
                },
            }),
            db.memberTag.findFirst({
                where: {
                    memberId,
                    tagId: alumniTag.id,
                    isActive: true,
                },
            }),
        ]);

        // Mutual exclusion logic
        if (isNowFinalist) {
            // Should be FINALIST only
            if (!currentFinalistTag) {
                await db.memberTag.create({
                    data: {
                        memberId,
                        tagId: finalistTag.id,
                        assignedBy: assignedByUserId,
                        notes: 'Auto-assigned: Final year student',
                    },
                });
                console.log(`[FINALIST] Tag assigned to member ${memberId}`);
            }
            if (currentAlumniTag) {
                await db.memberTag.update({
                    where: { id: currentAlumniTag.id },
                    data: {
                        isActive: false,
                        removedBy: assignedByUserId,
                        removedAt: new Date(),
                        notes: 'Auto-removed: Now a finalist',
                    },
                });
                console.log(`[ALUMNI] Tag removed from member ${memberId}`);
            }
        } else if (isNowAlumni) {
            // Should be ALUMNI only
            if (!currentAlumniTag) {
                await db.memberTag.create({
                    data: {
                        memberId,
                        tagId: alumniTag.id,
                        assignedBy: assignedByUserId,
                        notes: 'Auto-assigned: Completed course',
                    },
                });
                console.log(`[ALUMNI] Tag assigned to member ${memberId}`);
            }
            if (currentFinalistTag) {
                await db.memberTag.update({
                    where: { id: currentFinalistTag.id },
                    data: {
                        isActive: false,
                        removedBy: assignedByUserId,
                        removedAt: new Date(),
                        notes: 'Auto-removed: Now alumni',
                    },
                });
                console.log(`[FINALIST] Tag removed from member ${memberId}`);
            }
        } else {
            // Should have neither tag
            if (currentFinalistTag) {
                await db.memberTag.update({
                    where: { id: currentFinalistTag.id },
                    data: {
                        isActive: false,
                        removedBy: assignedByUserId,
                        removedAt: new Date(),
                        notes: 'Auto-removed: No longer in final year',
                    },
                });
                console.log(`[FINALIST] Tag removed from member ${memberId}`);
            }
            if (currentAlumniTag) {
                await db.memberTag.update({
                    where: { id: currentAlumniTag.id },
                    data: {
                        isActive: false,
                        removedBy: assignedByUserId,
                        removedAt: new Date(),
                        notes: 'Auto-removed: Year recalculated',
                    },
                });
                console.log(`[ALUMNI] Tag removed from member ${memberId}`);
            }
        }
    } catch (error) {
        console.error('[TAGS] Error updating member tags:', error);
        // Don't throw - this is a background operation
    }
}


/**
 * Legacy function for backward compatibility
 * @deprecated Use updateMemberTags instead
 */
export async function updateFinalistTag(
    memberId: string,
    assignedByUserId: string
): Promise<void> {
    return updateMemberTags(memberId, assignedByUserId);
}
