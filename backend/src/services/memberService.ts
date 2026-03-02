import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';
import { generateFellowshipNumber } from '../utils/fellowshipNumberGenerator';
import { updateMemberTags } from '../utils/finalistHelper';
import { queueWelcomeEmail } from './emailService';

// ─── Input / Output Types ─────────────────────────────────────────────────────

export interface CreateMemberInput {
    // Core fields
    fullName: string;
    email: string;
    phoneNumber: string;
    gender: 'MALE' | 'FEMALE';
    regionId: string;

    // Academic (optional)
    courseId?: string;
    initialYearOfStudy?: number;
    initialSemester?: number;

    // Residence (optional)
    residenceId?: string;
    hostelName?: string;

    // Registration meta
    registrationMode?: 'NEW_MEMBER' | 'LEGACY_IMPORT' | 'TRANSFER' | 'READMISSION';

    // Tags
    /**
     * Tag UUID — used by the internal registration form which resolves tag IDs
     * from the tags API before submitting.
     */
    classificationTagId?: string;
    /**
     * Tag name — used by the self-registration approval flow which stores the
     * name and must look it up at creation time. Takes precedence if both are
     * provided (shouldn't happen in practice).
     */
    classificationTagName?: string;
    additionalTagIds?: string[];
    /**
     * Override first-timer tag assignment.
     * Defaults to (registrationMode === 'NEW_MEMBER') when omitted.
     */
    assignFirstTimerTag?: boolean;
}

export interface CreatedMemberResult {
    /** The newly created Member row (with region + courseRelation includes). */
    member: Awaited<ReturnType<typeof _createMemberRow>>;
    fellowshipNumber: string;
}

// ─── Internal helper (typed return for the member create) ─────────────────────

async function _createMemberRow(
    tx: Prisma.TransactionClient,
    data: {
        fullName: string; email: string; phoneNumber: string;
        gender: 'MALE' | 'FEMALE'; password: string; fellowshipNumber: string;
        regionId: string; courseId?: string; initialYearOfStudy?: number;
        initialSemester?: number; residenceId?: string; hostelName?: string;
        registrationMode: 'NEW_MEMBER' | 'LEGACY_IMPORT' | 'TRANSFER' | 'READMISSION';
    }
) {
    return tx.member.create({
        data,
        include: { region: true, courseRelation: true },
    });
}

// ─── Main Service Function ────────────────────────────────────────────────────

/**
 * Creates a fully-initialised Member record within a Prisma transaction.
 *
 * Responsibilities:
 *  1. Generate fellowship number + hash password  (done BEFORE the tx to
 *     keep the window inside the tx as short as possible)
 *  2. Create the Member row
 *  3. Assign classification tag   (by ID *or* by name — safe to pass either)
 *  4. Assign additional tags
 *  5. Assign PENDING_FIRST_ATTENDANCE tag when applicable
 *  6. Run finalist/alumni tag evaluation
 *  7. Queue the welcome email atomically alongside the member write
 *
 * Callers are responsible for:
 *  - Pre-flight validation (email uniqueness, region validity, etc.)
 *  - Any caller-specific side-effects that must be in the same transaction
 *    (e.g. marking a PendingMember as APPROVED, family assignment)
 *
 * @param input  Normalised member data
 * @param tx     Prisma transaction client — callers MUST wrap this in
 *               prisma.$transaction() so that caller-specific writes and
 *               this function's writes are fully atomic.
 */
export async function createMemberRecord(
    input: CreateMemberInput,
    tx: Prisma.TransactionClient,
): Promise<CreatedMemberResult> {
    const registrationMode = input.registrationMode ?? 'NEW_MEMBER';

    // 1. Pre-generate credentials (outside-of-row writes, safe to do inline)
    const fellowshipNumber = await generateFellowshipNumber();
    const hashedPassword = await bcrypt.hash(fellowshipNumber, 10);

    // 2. Create Member row
    const member = await _createMemberRow(tx, {
        fullName: input.fullName,
        email: input.email,
        phoneNumber: input.phoneNumber,
        gender: input.gender,
        password: hashedPassword,
        fellowshipNumber,
        regionId: input.regionId,
        courseId: input.courseId,
        initialYearOfStudy: input.initialYearOfStudy,
        initialSemester: input.initialSemester,
        residenceId: input.residenceId,
        hostelName: input.hostelName,
        registrationMode,
    });

    // 3. Collect tag assignments
    const tagConnections: Array<{ tagId: string; isActive: true }> = [];

    // Classification tag — resolve by name if only name provided
    if (input.classificationTagName) {
        const tag = await tx.tag.findUnique({ where: { name: input.classificationTagName } });
        if (tag) tagConnections.push({ tagId: tag.id, isActive: true });
    } else if (input.classificationTagId) {
        tagConnections.push({ tagId: input.classificationTagId, isActive: true });
    }

    // Additional (opt-in) tags
    for (const tagId of input.additionalTagIds ?? []) {
        tagConnections.push({ tagId, isActive: true });
    }

    // PENDING_FIRST_ATTENDANCE tag
    const assignFirstTimer =
        input.assignFirstTimerTag !== undefined
            ? input.assignFirstTimerTag
            : registrationMode === 'NEW_MEMBER';

    if (assignFirstTimer) {
        const tag = await tx.tag.findUnique({ where: { name: 'PENDING_FIRST_ATTENDANCE' } });
        if (tag) tagConnections.push({ tagId: tag.id, isActive: true });
    }

    // 4. Bulk-insert all tags in one query
    if (tagConnections.length > 0) {
        await tx.memberTag.createMany({
            data: tagConnections.map(({ tagId }) => ({
                memberId: member.id,
                tagId,
                assignedBy: member.id,
                isActive: true,
            })),
        });
    }

    // 5. Finalist / alumni tag evaluation (requires course + year + semester)
    if (input.courseId && input.initialYearOfStudy && input.initialSemester) {
        await updateMemberTags(member.id, member.id, tx);
    }

    // 6. Queue welcome email atomically
    await queueWelcomeEmail(tx, member.email, member.fullName, fellowshipNumber, member.qrCode);

    return { member, fellowshipNumber };
}
