// Centralized query filters for consistency across controllers

// Filter to exclude soft-deleted members
// Usage: ...activeMemberFilter or where: { ...activeMemberFilter }
export const activeMemberFilter = {
    isDeleted: false,
};

// Filter for querying relations where the related member must be active
// Usage: member: activeMemberRelationFilter
export const activeMemberRelationFilter = {
    isDeleted: false,
};
