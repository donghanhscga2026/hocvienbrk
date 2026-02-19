import { RESERVED_IDS } from '../constants';
import prisma from '@/lib/prisma';

export async function generateStudentId(): Promise<number> {
    // Find the highest ID currently in use
    // We exclude reserved IDs from the max calculation to avoid skipping large gaps if a reserved ID is manually inserted.
    // Actually, standard max logic is fine, but we must check if nextId hits a reserved one.

    const aggregation = await prisma.user.aggregate({
        _max: {
            id: true,
        },
    });

    let nextId = (aggregation._max.id ?? 0) + 1;

    // Check if nextId is in reserved list
    while (RESERVED_IDS.includes(nextId)) {
        nextId++;
    }

    // Also check if this specific ID already exists (in case of race conditions or manual inserts)
    // Though with standard max+1 logic, collision is unlikely unless manual insert of arbitrary ID happened.
    // Ideally we'd use a transaction or lock, but for MVP this loop is acceptable.
    let exists = await prisma.user.findUnique({
        where: { id: nextId },
    });

    while (exists || RESERVED_IDS.includes(nextId)) {
        if (RESERVED_IDS.includes(nextId)) {
            nextId++;
            continue;
        }

        // If it exists but not reserved (e.g. race condition), try next
        nextId++;
        exists = await prisma.user.findUnique({
            where: { id: nextId },
        });
    }

    return nextId;
}
