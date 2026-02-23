import NodeCache from 'node-cache';

/**
 * Global cache instance for frequently accessed, rarely changing data.
 * Default TTL is 1 hour (3600 seconds)
 * Check period is 10 minutes (600 seconds)
 */
const cache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 600,
    useClones: false // performance boost -> returns reference instead of deep copy
});

export default cache;
